# Connect the private cloud pilot

Code and local database tests are complete. A real Supabase project is not connected yet. Do not describe cross-device persistence as verified until the live checks below pass.

## Project configuration

1. Create a Supabase project owned by the app owner. Keep its database password and service-role/secret keys out of this app and chat.
2. Run `supabase/migrations/202609150001_private_workspaces.sql` once in that project's SQL editor (or apply it through Supabase migrations). It creates the approved-player list, private workspace table, RLS policies, and revision trigger. It does not read or change existing game data.
3. In Auth settings, enable email sign-in and disable public signup. This app uses email verification codes, not passwords or magic-link callbacks. Change the Magic Link email template to include `<p>Your WWBP sign-in code is {{ .Token }}</p>`. Keep the token expiry and rate limits appropriate for a small pilot.
4. Configure an email sender/SMTP for delivery to pilot users. Supabase's built-in email service has recipient and rate restrictions; verify delivery before inviting players.
5. Create the owner's Auth user through the Supabase dashboard/admin workflow. Approve that user's UUID in `pilot_members` using the SQL below. Repeat only for explicitly approved pilot players. Public self-signup cannot grant membership.
6. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is intended for the client; do not substitute a service-role or secret key. Both files are already handled by `.gitignore` appropriately.
7. Rebuild and restart the app after changing settings (`npm run build`, then `npm start`, or restart `npm run dev`). On Vercel, add the same values to the intended environment and redeploy. Use separate Supabase projects for testing and production.

Approve an existing Auth user in the SQL editor, replacing the placeholder UUID:

```sql
insert into public.pilot_members (user_id)
values ('REPLACE-WITH-USER-UUID'::uuid)
on conflict (user_id) do nothing;
```

Removing a row from `pilot_members` revokes database access without deleting the user's stored campaigns. Auth-user deletion cascades to the user's workspace and is a separate destructive administrative operation.

## Player experience

The root page requires login once Supabase is configured. An existing approved player requests an email code, enters it, and opens their cloud workspace. Every successful change saves to that account. Another device loads the same campaigns on sign-in; **Reload cloud data** fetches later changes. Saves use a revision check: a stale device is told to reload instead of silently overwriting newer data.

Browser-only campaigns are not uploaded automatically. **Transfer browser campaigns** previews the destination account and asks the player to confirm. Matching reports are skipped; conflicting turns stop the entire transfer. Original local browser data stays intact. Only browser data on the same origin is accessible; for a new hosted domain, import the original email/text reports there. Transfer from localhost storage to a different web domain is not automatic.

## Live acceptance checks before inviting players

- Use two separately approved test accounts and a third unapproved account. Verify email delivery, expired/incorrect codes, sign-out, and session refresh.
- Add fictional X308/X309-style campaigns to account A. Load them from a second browser/device signed in as A. Verify reports survive reloads.
- Sign in as B: A's campaigns must be absent. Attempt direct API/database access with A's identifiers while authenticated as B: no data may be returned or changed. Check the raw report text as well as metadata.
- The unapproved account and anonymous requests cannot access workspaces or approve themselves.
- Open A on two devices. Save on one, then save the stale copy on the other: the second save must report a conflict. Reload and retry.
- Transfer local fictional reports explicitly. Verify duplicates skip, conflicts leave cloud/local data unchanged, and failed saves never report success.
- Check deployed same-origin save requests, private/no-store response headers, and deployment assets for real reports or credentials. Test backup/restore operations before accepting valuable game data.

## Storage decision for this milestone

Each account has one versioned workspace document containing its campaigns and raw reports. This makes each multi-report import and local transfer a single atomic save and preserves the current data interface. It is intentionally a simpler first implementation than the proposed normalized campaign/report tables. It has a 3.5 MB API request ceiling, 100-campaign limit and 500 reports per campaign. This is below Vercel's function payload ceiling, with headroom for headers/JSON framing. The database also limits document size.

Before large-scale use or alliance sharing, migrate to individual campaign/report rows and explicit shared snapshots. Do not grant allies access to the workspace document. All current database calls use the user's session and public client key, with no service-role bypass. The API reparses raw reports on every save; the database separately enforces ownership, approval and revision constraints. A user who bypasses the app and calls the database directly can corrupt their own document, but cannot access another account's workspace. Loading validates documents and fails without replacing corrupted data.

References: [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel function limits](https://vercel.com/docs/functions/limitations).

# Hosted companion implementation plan

## Product agreement

Build a website players can open, sign in to, and use without installing Python. Preserve the current local prototype as a working reference. First release is invite-only with private player workspaces and multiple campaigns. Explicit alliance sharing is part of the roadmap.

Stack: Next.js and TypeScript, Vercel hosting, Supabase Auth and Postgres. Private object storage is optional for raw text reports; small reports can instead live in protected database records. Python is unnecessary for the hosted runtime.

## 1. Migrate the working companion

Scaffold Next.js with pinned dependencies and a lockfile. Port map, country search/details, report comparison, briefing, ledger, source report view, and responsive navigation into components. Keep the existing parser behavior and corrected atlas. Load campaigns through a data interface instead of the prototype's globally bundled reports or localStorage assumptions.

Deliver a signed-out shell and a clearly labeled synthetic demonstration. Preserve the difference between unknown forces and zero, suppression and usable units, occupation and influence, current and historical intelligence. Geography does not certify legal orders.

Acceptance: parser regressions pass; map controls and all three views work; desktop and mobile layouts are checked; shipped assets contain no real reports or player information.

## 2. Accounts and private campaigns

Configure Supabase projects and migrations. Implement invite-only sign-in, sign-out, recovery/session expiry, a private workspace per account, and campaign creation/selection. An external game number is descriptive metadata, never a global access key. Each private campaign records the player's position and game variant.

Apply row-level security to every private table before exposing it. Validate authorization on server operations, including imports and exports. Avoid shared caching of private responses. Separate development and production data and credentials.

Acceptance: automated tests with two accounts prove isolation for reads, inserts, updates, deletes, exports, raw reports, and guessed identifiers. Anonymous requests fail. Expired sessions fail safely. No privileged service key reaches the browser.

## 3. Report storage and imports

Validate text size and structure on the server, verify game/player identity against the selected private campaign, and show a preview before storing. Store raw source, parser version, content hash, and parsed results together so parsing can be audited and rerun. Imports are transactional and duplicate-safe. Treat a different report for the same turn as a conflict requiring an explicit revision choice, not a silent overwrite.

Provide campaign export and deletion with confirmation, useful error states, and backup/restore procedures. Import this owner's existing reports through the authenticated path. Replace tests' dependency on private files with sanitized synthetic CI fixtures while retaining optional private regression checks.

Acceptance: reload and second-device access preserve data; duplicate and conflicting imports behave correctly; malformed reports cannot partially modify a campaign; exports contain only authorized data; deletion covers associated records and any stored files.

## 4. Invite-only pilot

Deploy a preview, complete account-isolation and mobile/browser checks, then invite a few players. Use private reports only after access controls pass. Exercise multiple games and real report variations. Establish basic operational error reporting without report contents, upload/rate limits, backup ownership, account removal, and a reviewed hosting budget. Record the distribution status of supplied map/rules artwork before wider release.

Acceptance: players can join, create campaigns, import, review, export, and return without technical setup. Private source documents never appear in static assets or logs. Check restore procedures and sharing defaults before broader registration.

## 5. Explicit alliance sharing

Introduce campaign-specific alliance groups and invitations. A player must choose to share; matching game numbers or report diplomacy declarations do not grant access. Keep each player's private workspace intact.

Start with read-only sharing of explicitly selected, immutable intelligence snapshots: chosen turns and countries with provenance and observation dates. Do not automatically disclose whole raw reports, personal/contact information, private notes, draft orders, or future imports. Show exactly what a recipient will receive before publication.

Define membership roles, invitation expiry, departure/removal, revocation, and audit history. Revocation removes future app access; data a recipient already copied cannot be recalled. Combine reports without discarding conflicting claims or making old intelligence look current. Test both database and application enforcement, including revoked memberships and attempts to access the sender's unshared data.

Acceptance: two allies can inspect an explicitly shared snapshot; a third player cannot; future imports stay private; revocation works; provenance and conflicts are visible. Expansion to broader sharing requires an explicit product decision.

## Scope and sequencing

Initial release excludes order submission, combat simulation, billing, automatic email ingestion, and automatic diplomacy-based sharing. Notes and draft orders can be added after the import workflow is stable, with the same private ownership model. Do not turn the original local directory into the deployed application.

The first Next.js preview is implemented. See VERIFICATION.md for tested features and migration gaps. Complete the remaining interaction parity and persistence checks, then implement Supabase authentication and database-enforced workspace access. Browser-only campaign separation is not a security boundary between accounts.

## Map key follow-up

The player removed the printed color key from public/assets/world-map.png. Preserve that edited asset and its original dimensions; do not overwrite it from the older prototype map. Add an in-app player-color key generated from the same palette used by map markers, with player numbers/names and occupied versus controlled-minor symbols.

## September 15 implementation checkpoint

Auth/cloud integration is coded and locally tested, but connection to Supabase and live acceptance testing are pending. Follow SUPABASE-SETUP.md. The first cloud schema stores one atomic versioned document per private account; normalize campaign/report rows before alliance sharing. This is an explicit change from the original proposed schema, preserving its ownership boundary.

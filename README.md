# WWBP Online

A separate project for a hosted, private World Wide Battle Plan companion.

Status: runnable Next.js/TypeScript development preview. Multi-campaign browser storage, validated report imports, map, briefing, ledger, CSV export, and source viewing are implemented. Supabase login, private cloud save endpoints, database policies, and migration code are implemented. A live Supabase project and deployment are not connected yet. See docs/SUPABASE-SETUP.md.

The original working prototype remains at `G:/Personal/wwbp/companion` and is unchanged.

## Agreed direction

Next.js with TypeScript on Vercel, Supabase Auth and Postgres, private player workspaces, multiple campaigns, and eventual explicit alliance sharing. Start with an invite-only pilot.

Read [the implementation plan](docs/IMPLEMENTATION-PLAN.md) and [data access design](docs/DATA-ACCESS.md).

## Imported foundation

- `src/lib/wwbp/parser.cjs`: existing report parser and comparison logic, retained intact before a separately tested TypeScript migration.
- `src/data/atlas.json`: 255 shared map spaces, corrected coordinates, surface and air connections, and canal references. WMP/WOK is retained.
- `public/assets`: blank historical map and local Inter font with its license.
- `reference/local-companion`: existing interface source for migration reference, outside the public asset directory. It is not a runnable hosted application.
- `tests/parser.private.test.cjs`: the 10 existing report regression checks, using an explicit external fixture directory.

No personal turn reports, report bundles, colored turn maps, or rulebook PDF were copied. Shared map artwork remains third-party content; record its distribution status before a public launch. Keep attribution and the font license.

## Run the existing private regression tests

With Node installed, from this directory in PowerShell:

```powershell
$env:WWBP_FIXTURE_DIR = 'G:/Personal/wwbp/turns'
node --test tests/parser.private.test.cjs
```

These checks expect the original three report fixtures. A later milestone adds sanitized fixtures suitable for repeatable CI without private game information. Players of the eventual hosted app will only need a browser.

## Run the Next.js preview

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Use **Explore the fictional demo** to try two independent campaigns without real reports. Demo changes are temporary. Outside the demo, **Add campaign** accepts the exact identifier printed in a report (for example `WW-X309`) and your player number, then **Import reports** previews validated text files before saving.

This milestone uses browser storage behind a repository interface. It is not authenticated tenant isolation and is not ready for public player accounts. Different browsers/devices do not share saved data. Preserve original text reports; campaign JSON export is available, while JSON restore and conflict revision workflows are still pending. The original local companion remains usable throughout the migration.

Production checks: `npm run build` and `npm run typecheck`. Synthetic tests: `npm test`. The original private-fixture tests remain available as described above. Dependencies are pinned in package.json and package-lock.json; Python is not needed to run this app.

See [verification and remaining work](docs/VERIFICATION.md). Next phase is Supabase account/workspace design and implementation, including database policies tested with independent accounts before private reports are stored online.

## Paste reports directly from email

Select a campaign, choose **Import reports**, paste the complete email report into **Email report**, then choose **Review pasted report** and **Confirm import**. **Choose text files** remains available in the same dialog. Pasted reports receive a source filename derived from game, turn, and player; the usual identity, duplicate, and conflict checks still apply.

## Account and cloud-save milestone

Read [Supabase setup](docs/SUPABASE-SETUP.md) to connect the app. Without environment settings the browser-only mode remains available. With Supabase configured, the root requires email-code login and cloud storage accepts approved accounts only. Local campaigns transfer only through an explicit confirmation. The edited map asset is preserved.

`npm test` now includes actual PostgreSQL RLS tests in an isolated, in-memory PGlite database. They use fictional users/data and do not need a Supabase account. These tests do not replace live email/session/two-browser acceptance checks.

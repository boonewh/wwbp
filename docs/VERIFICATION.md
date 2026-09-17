# Development preview verification — September 13, 2026

## Implemented

- Next.js 16.3.5, React 19.3.0, TypeScript 7.0.2, exact versions and npm lockfile.
- React campaign selector, create-campaign form, independent turn/comparison selectors and source dialogs.
- Text import preview, game/player checks, duplicate skipping, atomic batch rejection on conflict or malformed input, and local persistence through a repository interface. Storage failures are surfaced before the UI reports success.
- Corrected 255-space SVG atlas with pan, zoom buttons, country selection, connection details, unknown-force handling, and sea fleet details.
- Briefing, rejected-order and historical-order displays, command ledger, CSV export, and campaign JSON export.
- Explicitly fictional two-campaign demo; no original private reports in shipped data.

## Checks completed

- Production build and its TypeScript check pass.
- Eight synthetic regression tests pass: separate campaigns, wrong-game/player rejection, atomicity, duplicates/conflicts, campaign creation, storage validation/failure, and unknown intelligence.
- All 10 original report parser regressions pass using external private fixtures.
- Browser: fictional campaign switching (different army totals and histories), creating a third campaign, briefing and ledger views, mobile Views disclosure, desktop and phone layouts.
- No page-wide horizontal overflow at 1440px and 390px widths. No browser error logs in the exercised flows.

## Remaining before hosted pilot

- Supabase account setup, invite-only login, database migrations, row-level security, two-account authorization tests, server import validation, cloud persistence, and deployment.
- End-to-end browser file-upload/persistence/restore testing. Import logic is tested automatically, but the file chooser and successful new-upload save path have not yet been exercised in the browser.
- Full interaction parity: map wheel/keyboard controls, map layer filters and player-color key, per-country dated history, more complete diplomacy/ranking presentation.
- Campaign deletion, JSON restore, and explicit conflicting-report revisions.
- Automated browser coverage, hosting budget and operations, distribution status of historical artwork.
- Alliance sharing remains planned; no memberships or sharing grants exist yet.

The localhost preview is not an authenticated service. Browser separation is a temporary development data model, not tenant security.

## Direct email paste import

Added paste-first import dialog with optional file selection. Four additional tests cover direct import, copied non-breaking spaces/Windows line endings, empty/incomplete/oversized input, and campaign/conflict checks. All 12 synthetic tests and the production build pass. Browser-verified a complete fictional turn 3 paste, review, and confirmation; the new turn appeared in the selector. No browser errors in this flow. This demo check does not verify persistent saving across reloads.

## Cloud integration — September 15, 2026

- Implemented cookie-based Supabase email-code login/sign-out, session-refresh proxy, dynamic authenticated root, and uncached account-scoped workspace API.
- Added approved-account table, workspace RLS, immutable ownership and revision trigger, server-side report revalidation, explicit local transfer, stale-save conflict handling, and 3.5 MB request ceiling.
- 19 synthetic/database tests pass, plus all 10 original private-fixture report tests. Production build and TypeScript check pass.
- PostgreSQL tests execute the migration against PGlite with simulated Supabase auth roles. They cover cross-account read/write/spoof attempts, anonymous access, approval/revocation, invalid documents and concurrent save revisions.
- Live Supabase, email delivery, actual session expiry, cross-device persistence and hosted deployment remain unverified because project settings have not been supplied.
- Browser automation was unavailable during this milestone; no new visual/browser verification is claimed. HTTP checks cover the unconfigured setup page and unauthenticated/cross-site denial.
- Storage deliberately starts with an atomic workspace document. The normalization plan before alliance sharing and pilot size limits are documented in SUPABASE-SETUP.md.

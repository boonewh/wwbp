# October 2026 security maintenance

This maintenance release updates dependencies/runtime tooling. It does not publish
uncommitted connected-battle work, change game calculations, convert saved workspaces,
or alter database definitions, policies, account approvals or cloud settings.

## Toolchain and dependencies

- Node 24.22.1 (or a newer security patch in Node 24), npm 11.17.0.
- Next 16.4.3; React/DOM 19.3.1, retaining the existing React 19.3 line.
- Supabase JS 2.118.0 with the existing Supabase SSR 0.12.7.
- TypeScript remains 7.0.2; React type definitions remain 19.3.0.
- Node type definitions now match Node 24 instead of advertising Node 26 APIs.
- PGlite 0.5.13 is used only in isolated policy tests; tsx 4.23.15 runs tests.
- Sharp 0.35.5, PostCSS 8.5.23 and source-map-js 1.2.2 resolve upstream advisories.

Use `npm ci --ignore-scripts`, `npm run typecheck`, `npm test` and `npm audit`.
The Linux CI workflow pins the same tools and uses no production credentials.

## Synthetic browser verification

Install Chromium once with `npx playwright install chromium`, then run
`npm run test:browser`. The runner builds and checks two configurations sequentially:

1. Browser-only: cloud settings explicitly empty, fictional demo/private browser
   storage, synthetic paste imports, exports, order drafts and coordinated analysis.
2. Configured cloud: a local Auth/PostgREST fixture on 127.0.0.1:4531 and local app
   on 127.0.0.1:3321. The real Supabase SDK and app routes handle synthetic invited
   OTP login, cookie refresh, sign-out, pilot approval, owner-scoped reads, saves,
   stale revisions, first-save races and invalid/cross-site/oversized requests.

The fixture sends no email and connects to no database. Browser requests to other
origins are blocked. In-memory fixture accounts/reports are invented; they do not
come from a private report folder or an environment file. The fixture is under
tests, is not imported by the app, and provides no route in a deployed application.

After verification, the runner removes only this repository's generated `.next`
directory so a build containing synthetic cloud settings cannot be mistaken for
a release artifact. Traces/screenshots remain under ignored `test-results`.
Run a fresh production build with the intended environment before `npm start`.
Vercel Git deployments build independently with the project's existing settings;
do not publish the synthetic browser-test output as a prebuilt deployment.

HTML responses are checked for private/no-store cache policy; Next manages their
Vary header. Workspace API responses additionally retain explicit Vary: Cookie.
Auth cookies are refreshed and remain usable after reload. The existing row-level
security suite executes the unchanged migration only in an in-memory PGlite database.

SDK regressions confirm owner/revision filters and response shapes, no automatic
retry of uncertain inserts/updates, retryable reads, and no retry after an aborted
read. The SDK's intentional read-abort correction is accepted; no app retry policy
or automatic cloud-save retry was added.

## Data and release boundaries

Keep workspace version 1, local storage key `wwbp.online.workspace.v1`, own/allied
reports, saved scenarios/plans, drafts, edited map artwork, approval/RLS and revision
conflict semantics intact. Existing private reports and unpublished source stay in
their original local folders and private preservation copies, outside this public repo.

Database changes require a separately explained plan before execution. No real
email code, customer login, campaign import/save, account approval or production
database operation is part of these automated checks. A mocked provider test does
not claim to verify real Supabase email delivery or live cross-device persistence.

Production release requires review of the tested result before merge/deployment.
The active Vercel site is https://wwbp-companion.vercel.app; use its confirmed source
branch/project rather than an older prototype or stale GitHub homepage URL.

[Next security bulletin](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
and [Supabase JS release](https://github.com/supabase/supabase-js/releases/tag/v2.118.0).

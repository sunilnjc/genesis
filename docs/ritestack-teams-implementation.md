# RiteStack Teams implementation checkpoint

28 September 2026. Branch `codex/teams-foundation`, based on main `02d517a`. This is a first implementation milestone, not a pilot-ready or deployed release.

## Implemented

- Feature-gated `/teams` and `/w/[workspaceId]` routes, personal/workspace switching, verified-user commands, and 30-day workspace pilot entitlements independent of personal purchases.
- Additive tables and read RLS; all mutations use a bounded transactional command function. Only explicitly allowlisted pilot accounts can create workspaces. No new personal-table policies or personal entitlement changes.
- Owner/admin/member roles; owner-only admin appointment; removal immediately hides shared records, clears assigned ownership, and revokes outstanding invitations. The sole owner cannot be removed. Workspace archive preserves data.
- Seven-day, single-use invitations stored as hashes, bound to verified email, revocable, with serialized acceptance. This milestone returns a shareable invitation link; it deliberately has no outbound invitation-mail sender.
- Per-record inventory edits with expected versions; owner membership and workspace links enforced in Postgres. Open review snapshots are superseded on edits; completed snapshots are retained.
- Recommendation → admin approval/clarification → assigned administrator's vendor execution record. Keep completes at approval. Reduce/pause/cancel require execution. Actions do not cancel anything at vendors.
- CSV preview and atomic import with row validation, active-member mapping, duplicate detection, stable import idempotency keys, and safe quoted CSV export. Currency precision is validated and money is stored as integer minor units.
- Comments, append-only activity, and outcome displays separating approved potential changes from future-effective and already-effective vendor changes. No FX aggregation or claim of realized cash savings.
- Existing magic-link callback uses the configured application origin behind a proxy; explicit local Supabase opt-in enables isolated testing without changing hosted defaults.

## Verification

Baseline: 113 existing unit tests passed; TypeScript passed. Fresh local Supabase stack uses project ID `genesis-teams`, API port 57321, database 57322, local email catcher 57324. Other local stacks and production databases were not changed.

- Database suite: 69 checks passed, including two-workspace isolation, member scope, direct write/role denial, owner protection, membership removal, stale versions, concurrent invite acceptance, replay/expiry/revocation, all four decision paths, import rollback/idempotency/duplicates, and immutable activity.
- Full unit suite: 118 tests pass (113 baseline plus 5 Teams tests). Domain coverage: currency precision, timezone boundaries, CSV quoting, malformed dates, owner matching, duplicate detection, and spreadsheet formula escaping.
- HTTP checks: authentication, cross-origin denial, create/read workspace, secret-free invitation persistence, malformed input, and inaccessible workspace denial. A transient Next development manifest error during hot reload passed on targeted rerun; compiled verification is recorded below.
- Browser: owner created Studio pilot, invited a local test member; member signed in via local email, accepted the invitation; owner assigned a ten-seat $150 tool and opened a review; member submitted seven seats/$105 with a reason; reload retained awaiting-approval state and hid approval controls from the member. Desktop layout visually inspected. Do not count the attempted viewport override as mobile verification; screenshot dimensions did not change.

- TypeScript and changed-file ESLint pass. Full OpenNext Cloudflare build passes with this checkout's own `npm ci` dependencies. An initial build using a symlink to another worktree failed bundling native Sharp; a clean lockfile installation resolved it.
- Compiled Worker HTTP smoke checks pass against local Supabase. With `TEAMS_ENABLED=false`, `/teams`, `/api/workspaces`, and `/w/[workspaceId]` all return 404. No hosted deployment was used.
- Added a GitHub Actions job that starts an isolated local Supabase stack and runs database, unit, TypeScript, lint, and HTTP checks without production secrets.

## Local reproduction

Use a clean checkout with Docker running and install the lockfile dependencies with `npm ci`. Do not copy production `.env.local` into this checkout.

```sh
npx supabase start -x studio,realtime,storage-api,imgproxy,postgres-meta,edge-runtime,logflare,vector
node scripts/teams-local-env.mjs
node --env-file=.env.local scripts/teams-integration.mjs
npx next dev --webpack --hostname 127.0.0.1 --port 4318
# In another terminal:
node --env-file=.env.local scripts/teams-api-smoke.mjs
npm test
npx tsc --noEmit
```

Fixtures use `teams-*@example.invalid` and a documented local-only password in the integration script. The scripts refuse any Supabase URL except this exact local stack. Local magic-link emails are caught by Mailpit; no real recipients or customers are contacted. Fixture data is intentionally retained for browser checks. `npx supabase db reset --local` resets only this local stack; never use a hosted reset.

## Remaining before pilot

1. Notification outbox, in-app notifications, scheduled review opening, reminder retries/escalations and weekly email digest, with recipient allowlists and revocation checks.
2. Ownership transfer and account-deletion integration; explicit personal-to-team copy preview; restore/admin recovery for archived workspaces; complete historical review detail and data export beyond inventory CSV.
3. Automatic next-renewal scheduling with month-end/leap-year tests, adjustable reminder timing, and cancellation notice periods. Currently deadlines are explicit dates and reviews are opened manually.
4. Mobile browser QA, compiled staging smoke test with real staging auth, operational failure visibility, and pilot instrumentation.
5. Separate hosted staging database/Worker, migration backup/restore rehearsal, and staged pilot enablement. Supabase CLI project listing currently returns Unauthorized; no hosted staging access is established in this checkout. Do not apply this migration to production to work around it.
6. Team recurring billing and lifecycle tests. Proposed $29 pricing is unvalidated and unpublished. No recurring billing or customer charges were created.

Production was checked read-only: `ritestack.app/api/billing/status` reports Paddle Live, unlike the older billing note in the planning document. Existing personal purchases remain untouched. No production migration, deployment, or external invitation was performed.

## Deployment guard

Keep `TEAMS_ENABLED` absent/false in production. Pilot creation additionally requires a trusted administrative insertion into `team_pilot_accounts`; browser/API users cannot add themselves. New schema is additive. Disabling team routes does not revoke direct authenticated database access for already-created memberships, so a full incident shutdown must also disable/revoke the team SQL command execute grant and relevant read policies. Do not describe the UI flag alone as complete database revocation.

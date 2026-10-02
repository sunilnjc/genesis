# RiteStack Teams — product, architecture and implementation plan

Planning baseline: 28 September 2026. This is a proposed implementation plan, not a record of shipped functionality.

## Product decision

Build Teams within the existing RiteStack product and repository. Use a personal/team workspace switcher and workspace-specific routes. Keep personal subscriptions and personal purchase entitlements unchanged. Teams gets its own workspace entitlement. Develop against a separate staging database and Worker before enabling it for pilot accounts.

Initial buyer: founder or operations lead at a 5–30-person digital, software or creative agency. This segment is a hypothesis to validate with three pilot teams.

Promise: Every software subscription has an owner, a decision deadline, and a recorded outcome before renewal.

Value: fewer unattended renewals, accountable seat reviews, and visible completed cost reductions. Ownership and reminders are established competitor features; our differentiation must be demonstrated through easy onboarding and sustained use by small teams.

## Core journey

1. Create workspace; choose timezone; invite colleagues.
2. Add subscriptions or import CSV with a preview and per-row validation.
3. Assign a responsible member; record actual charge, currency, billing interval, next renewal, purchased seats and cancellation deadline where known.
4. Open a renewal review before the decision deadline.
5. Owner confirms needed seats and recommends keep, reduce, pause or cancel with a reason.
6. Admin accepts the recommendation or returns it for clarification.
7. Assigned executor makes any change at the vendor and records outcome and effective date.
8. RiteStack closes the review, records the next renewal and shows completed savings separately from recommendations.

Example: 10 seats cost $150/month; owner confirms 7 needed; admin approves reducing to 7; executor records the vendor change to $105/month effective next month. Show $45/month run-rate reduction after the effective date, not $540 of already-realized cash savings.

## First release

- Workspace creation, switching, invitations and membership management.
- Manual subscription entry and safe CSV import/export.
- Owners, billing intervals, currencies, seats, cancellation deadlines and last-confirmed timestamps.
- Decide queue: reviews due, unanswered requests, missing owners and approved actions awaiting completion.
- Review detail with recommendations, comments, approval, execution and history.
- In-app notifications, transactional email and a weekly admin digest.
- Results showing approved potential reductions separately from completed effective reductions.
- Workspace activity history, archive and data export.

Screens: Decide, Inventory, subscription/review detail, Team, Results and Settings. Preserve the existing compact mobile experience. Use explicit empty, loading, failure and conflict states.

Later: departure checklists generated from ownership and explicitly recorded seat assignments; selective usage integrations; accounting imports; optional AI summaries. AI is unnecessary for first-release value. Automated cancellation, access revocation, bank scanning, vendor negotiations and enterprise procurement are outside the first release.

## Permissions

Workspace owner controls billing, ownership transfer and deletion, with all admin powers. Admin manages inventory, members, approvals and execution records. Member sees only subscriptions assigned to them and their related reviews/comments, including the relevant costs; may submit recommendations but cannot approve or edit billing. Broad team visibility can be introduced later as an explicit setting.

Only the owner can appoint admins; admins can invite/remove ordinary members. Prevent deleting/removing the last owner. Membership removal revokes access immediately, cancels pending notifications to that person and marks their tools as needing reassignment. Preserve historical actor identifiers for audit history. Never interpret ownership removal as vendor access revocation.

Invites are single-use, expiring and revocable, stored as token hashes, and accepted only by an authenticated user with the matching verified email. Workspace membership is checked from the database on each operation, not trusted from a client-supplied workspace ID or stale role claim.

## Existing implementation findings

- Next.js 16.3.5, React, TypeScript and Tailwind/shadcn UI.
- Cloudflare Worker deployment through OpenNext.
- Supabase magic-link auth; personal subscriptions protected by user_id RLS.
- Current subscription model contains monthlyCost, renewDate and keep/cut/pause decisions.
- Current persistence in src/lib/subscriptions/remote.ts reads all IDs, deletes absent IDs and upserts a whole list. Do not reuse this algorithm for shared data.
- Current billing is user-profile based with Stripe code; it is not a team recurring-billing model or evidence that live commercial payments are ready.
- Referenced historical handoff file was not present in docs during this inspection. Use actual source and verified deployment state when implementing.
- Read applicable installed Next.js documentation before writing framework code, as required by AGENTS.md.

## Architecture

Browser/PWA → Next.js UI and authenticated team command endpoints → Supabase Auth and Postgres.

Dedicated Cloudflare scheduled Worker → transactional notification outbox in Postgres → email provider.

Retain existing application stack. Team domain modules live under src/lib/teams; views under src/app/w/[workspaceId]; team endpoints under src/app/api/workspaces. Keep scheduled execution in a separate Worker so it has its own scheduled handler, deployment and operational controls.

Use caller-authenticated Supabase clients for normal team reads/commands, maintaining database RLS. Sensitive multi-record operations use transactional database functions with explicit authorization. Restrict privileged credentials to bounded server jobs; never expose them in the browser. Restrict execution grants and search paths on privileged functions and test against privilege escalation.

## Proposed data model

Use additive team tables first. Existing public.subscriptions remains personal, avoiding changes to legacy user_id policies or accidental exposure during migration.

| Table | Main purpose |
| --- | --- |
| workspaces | Name, timezone, owner, lifecycle state |
| workspace_members | Unique workspace/user membership and role |
| workspace_invitations | Email, role, token hash, expiry, acceptance and revocation |
| team_subscriptions | Workspace, owner, currency, actual billing amount/interval, seats, renewal, notice deadline, freshness, version, archive state |
| renewal_reviews | Subscription and renewal occurrence, decision deadline, state, proposed action, proposed seats/cost, approver, executor, optimistic version |
| review_comments | Workspace/review, author and body |
| review_actions | Completion outcome, effective date, before/after cost snapshot and optional vendor reference |
| activity_events | Append-only business-event history written by authorized commands |
| notification_outbox | Recipient, event key, schedule, attempts, lease, provider receipt and delivery state |
| workspace_entitlements | Pilot/paid state and workspace limits, independent of personal purchases |

Every tenant-owned row carries workspace_id. Composite foreign keys enforce same-workspace links between reviews, subscriptions, comments and actions. Enforce uniqueness per subscription/renewal occurrence, and per notification event/recipient/channel. Validate tool ownership against an active member of the same workspace.

Store monetary values exactly with supported currency precision; never use floating-point arithmetic for billing totals. Record actual interval cost, with monthly equivalents derived for display. Keep totals separate per currency in v1. Store calendar dates for contractual deadlines and UTC timestamps for events; calculate reminders in workspace timezone. Handle month-end and leap-year renewals explicitly.

## Workflow rules

Review states: awaiting_owner → awaiting_approval → awaiting_execution → completed. Admin can return a recommendation to awaiting_owner. Explicit cancelled/superseded states handle removed tools or amended renewals.

Decision is a separate field: keep, reduce, pause or cancel. Keep can complete at approval. Other decisions require execution confirmation. Deferring a review reminder is distinct from pausing a vendor subscription. Past-deadline reviews stay visible until resolved; do not silently imply that cancellation is still possible.

Use explicit cancellation deadline if supplied; otherwise derive from renewal and entered notice period. Show unknown notice terms clearly. Proposed defaults: open review 30 days before decision deadline, remind after 7 days without response, escalate 7 days before deadline, include overdue work in weekly digest. Immediately surface imported records already inside the review window. Customers can adjust reminder timing.

Renewal records are historical snapshots. Updating a subscription must not rewrite completed decisions. Correcting a renewal date explicitly supersedes an open review and invalidates obsolete reminders. Missing recurrence information requires user confirmation rather than invented future dates.

## Concurrent editing and notifications

Use per-record create/update/archive commands with expected version checks. If another person changed a record, return a conflict and offer refresh/review; never overwrite their work silently. Approvals and completion create their history and outbox events in the same database transaction. Require idempotency keys for repeatable commands and imports.

The scheduled Worker claims due outbox records with bounded leases, rechecks current membership/review state, sends, records provider IDs and retries temporary failures with backoff. Use a provider idempotency key where supported. Where send outcome is ambiguous, record it for reconciliation rather than promising exactly-once email. Surface persistent failures to admins. Add Cloudflare Queues only if volume requires it; Postgres outbox is sufficient for a small pilot.

Only invitation and notification emails explicitly triggered by product users or configured workspace rules are sent by the application. Development/staging delivery uses a test inbox or recipient allowlist.

## Migration and deployment

1. Create an isolated implementation branch/worktree and record baseline checks.
2. Apply additive schema to local/staging databases and verify RLS with separate users and workspaces.
3. Ship team routes behind a workspace/account feature flag, leaving personal behavior intact.
4. Provide an explicit personal-to-team copy preview; default to copying into a new team record. Explain that selected information becomes visible to assigned team members/admins. Never silently move or expose personal data.
5. Exercise a full review cycle in staging with email delivery restricted.
6. Apply additive production migrations after backup/restore readiness, then enable pilot accounts gradually.
7. Rollback disables team entry points and scheduled sends while retaining team data and leaving personal accounts operational. Avoid destructive schema rollback.

## Implementation sequence and acceptance

| Phase | Deliverable | Acceptance gate |
| --- | --- | --- |
| 0: Baseline and design | Confirm current runtime/auth, wireframes, role matrix, schema and sample journey | One complete journey and baseline checks recorded |
| 1: Workspace foundation | Additive tables, RLS, invites, switcher, role controls | Two-workspace isolation, expired/replayed invite and removed-member tests pass |
| 2: Shared inventory | Per-record commands, CSV preview/import, owners and billing data | Two users can edit without silent lost updates; import errors and duplicates are visible |
| 3: Decisions | Review state machine, recommendation, approval, execution and audit | Full keep/reduce/pause/cancel flows; invalid transitions rejected server-side |
| 4: Reminders | Outbox, scheduled Worker, email and digest | Retry, duplicate execution, obsolete review and revoked-recipient scenarios verified |
| 5: Results and pilot | Effective savings, export, activity, responsive QA, staging rehearsal | Three invited pilot teams can complete the journey; personal app regression checks pass |
| 6: Commercial readiness | Workspace billing adapter, verified provider setup, recurring entitlement lifecycle | Checkout/webhook retry, cancellation, failed payment and restore flows pass in sandbox before live use |

Planning estimate: roughly 3–4 engineering weeks for a pilot-ready release with one developer, excluding provider onboarding delays. Re-estimate after phase 1. Commercial billing and actual customer observation may extend the calendar; this is not a delivery commitment.

First implementation slice: a signed-in owner creates a workspace, invites a member, adds a tool, assigns it, and the member submits a recommendation. Deliver this complete path before expanding reporting.

## Verification and operations

- Database tests: cross-workspace access, member scope, role escalation, last-owner protection, same-workspace foreign keys, immutable history.
- Domain tests: notice periods, month-end dates, recurrence, currencies, effective savings, all review transitions and corrections.
- Integration tests: optimistic conflicts, duplicate commands, concurrent invite acceptance, reminder retries and email ambiguity.
- Browser tests: owner/member journey, revoked access, mobile layout, CSV preview and exports; personal auth/inventory/purchase behavior regression.
- Run lint, relevant tests and production Worker build; smoke-test the compiled deployment with real staging auth.
- Observe scheduler heartbeat, oldest pending reminder, persistent delivery failures, API errors and permission failures. Keep secrets and raw invite tokens out of logs.

## Pricing and pilot measurement

Offer a time-bounded pilot. Test a proposed $29/workspace/month flat price for up to 30 members; this is a pricing hypothesis, not a published plan or verified willingness to pay. Keep existing personal purchases separate. Provider selection and merchant readiness need verification; the existing Stripe test path must not silently become Teams live billing.

Activation target: within seven days, import/add ten real tools, assign owners to at least 80%, invite another member and complete one real review. Observe a full relevant renewal cycle (extend beyond 30 days when needed).

Measure completed reviews before deadline, unresolved executions, owner response rate, inventory freshness, weekly admin use and documented effective savings. Seek paid commitments from at least two of three pilots before broadening features. These are proposed learning gates, not forecasts.

## Technical references

- Supabase database authorization: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cloudflare scheduled Workers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Optional later queue retries: https://developers.cloudflare.com/queues/configuration/batching-retries/

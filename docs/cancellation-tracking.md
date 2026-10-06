# Cancellation tracking — 6 October 2026

Web Cut now records a pending cancellation and opens Cuts. Pending items remain in monthly burn and the renewal queue. The default 14-day view also retains overdue pending cancellations; All Decide includes every pending cancellation. Existing cuts start pending rather than being silently treated as cancelled.

Cuts offers a provider link, a user-saved backup billing URL, generic recovery instructions, and an explicit provider-confirmation checkbox with a date and optional 500-character note/reference. Confirmation is user reported, not independently verified. Only confirmed cancellations count toward estimated monthly savings. Reopening a confirmation restores the pending cost and reminders. Finishing an existing cancellation remains available after the trial expires.

Reminders are in-app plus an optional iCalendar download. Importing the file schedules a local-calendar event/notification three days before the recorded renewal at 9am, or 15 minutes from download if that reminder date has passed. Users must remove an imported reminder after confirmation; calendar files do not synchronize with the app. No scheduled reminder emails or automatic provider cancellation is claimed or implemented.

## Database rollout

Apply `supabase/migrations/20261006060000_cancellation_confirmation.sql` before deploying web code. It adds nullable confirmation date, note, and backup URL fields to RiteStack subscriptions. Existing owner-only RLS/grants remain unchanged. The existing timestamp trigger additionally clears confirmation when a decision changes away from Cut, including writes from older native clients. No historical cuts are backfilled as confirmed. The migration was applied using the RiteStack SQL editor, not Supabase CLI migration history.

This release adds the workflow to the website. Native client UIs have not been released with these controls. Their existing upserts preserve the new fields; the database trigger clears stale confirmation on decision changes.

## Verification

- 125 unit tests: pending and confirmed accounting, overdue/default queues, reopening, invalid dates, oversized notes, calendar escaping/folding, and near/past renewal dates.
- TypeScript, changed-file ESLint, and OpenNext production build.
- Authenticated live database tests with existing QA accounts: confirmation round-trip, cross-account read/write isolation, old-client upsert preservation, decision reset; disposable API fixture cleaned up.
- Local browser using a disposable row in the existing QA account: Cut navigation, backup URL save, required confirmation checkbox, date/note persistence after reload, totals, reopen, calendar download, and 390px layout without horizontal overflow.
- Existing local-development hydration warnings predate this feature. Physical mobile calendar notification delivery is not independently tested; import and notification settings belong to the user's calendar app.

Deploy through OpenNext/Wrangler after PR merge; GitHub's deployment workflow remains disabled. Rollback can redeploy the prior Worker; the additive columns may remain. Preserve the schema while any newer clients are open.

# RiteStack status — 21 September 2026

## Shipped

- PR #29: `/cuts`, free receipts using existing subscriptions and RLS; no migration. All hosted receipt checks passed.
- PR #30: public unsigned homepage with product explanation, unchanged pricing, contact, and legal links. Signed-in home stays Decide. Verified over HTTPS and with JavaScript disabled.
- PR #31: 14-day Decide view, default on. Date-only renewal today through day 14 inclusive, plus paused rows whose existing `remind_at` is in that window. Cuts excluded; switching the chip off restores the original Decide queue. Inventory remains complete.

## Paddle Live

Account: RiteStack, seller 427385, Live dashboard `https://vendors.paddle.com`.

- Account verification: **In progress**; dashboard says its team is reviewing the details, nothing further required now.
- Website: **Action required again on a fresh visit** after initially showing Pending. Founder asked for any new review email before another submission. Resubmitted `ritestack.app` after PR #30 removed the public homepage login barrier. Prior email cited unavailable site/SSL/login restrictions. HTTPS verified successfully and the public offer is now readable without a session or JavaScript.
- Product: `pro_01m32bw1m2f1ysxny4fj53kfcp`, RiteStack ritual, Active, Standard digital goods.
- Price: `pri_01m32bxrja7e8ve7p754njp4g7`, $14 USD one-time, `one-time-14`, quantity 1, Active.
- Webhook: `ntfset_01m32cpp07qvnc211tt0ps3075`, Active, Platform API v1, `transaction.completed` and `transaction.paid`, `https://ritestack.app/api/billing/paddle-webhook`.
- API key `RiteStack Live checkout`: Active; Transactions read/write and Client-side tokens read. Founder confirmed private storage. Expires 20 December 2026. No secret values recorded here.
- Live default payment link save has not yet been confirmed as persistent. Recheck `https://ritestack.app/unlock` after website approval.
- Live client token `RiteStack Live checkout`: Active, `ctkn_01m32cxq1rqhpwjcdc205c63rz`. No token value recorded here.
- Payout setup: saved successfully by the founder. Dashboard confirmation verified; wire transfer in USD. No bank details recorded here.
- Still needed: approved verification/domain, persistent Live default payment link, privately entered webhook secret/API key in Wrangler, final Live checkout verification.

Production remains **Paddle sandbox**. No Worker billing secrets changed. Do not flip until all Live prerequisites pass. No fake paid grants. The app obtains the client token from the selected Paddle environment through its server API key; no hardcoded token change is required.

## Operations

Worktree: `/Users/Sunil/2026/agents/genesis-wt-cut-receipt-codex`; original genesis checkout left untouched.

GitHub deployment workflow 361594427 remains disabled. Merge each PR, then deploy Worker `ritestack` using OpenNext/Wrangler. Never touch Job Pursuit.

Validation: full lint has 7 existing errors in unrelated auth/form/animation files. Changed-file lint, TypeScript, unit tests, and OpenNext builds pass. Browser tests use dedicated `ritestack-iso-cuts-*@example.invalid` accounts and remove only their rows afterward; entitlement display tests are mocked, not paid grants.

## Final verification

- All three product PRs (#29, #30, #31) merged and published. Current Worker version: `eb1a994b-439c-445c-8a99-02f621fde057` (main `38fb01b`).
- 104 unit tests pass; TypeScript, changed-file lint, and the OpenNext production build pass.
- All 12 hosted browser/API checks passed across runs. One session drop and one checkout transport timeout passed on targeted reruns; keep these intermittent issues noted.
- Sandbox checkout creation returned a Paddle sandbox overlay configuration. A client success query did not grant payment access. No real payment was attempted and no new signed-payment webhook grant was tested in this session.
- Hosted unsigned home, mobile layout, JavaScript-disabled product/pricing, Cuts, real cut persistence, cross-account isolation, trial/paid/paywall receipt display, 14-day boundaries/toggle, paused reminders, complete Inventory, and loading/read errors verified.
- HTTPS: HTTP 200, certificate verification successful. Unsigned Paddle webhook: HTTP 400, invalid signature. Deploy workflow still disabled.
- Account verification is in progress; domain has returned to Action required. Do not switch Worker secrets to Live. Await the latest domain-review instructions before resubmitting.


## iOS companion — 27 September 2026

Native SwiftUI source is now in `ios/` (PR #34, main `c66328f`). Build and release instructions: `ios/README.md`; verified evidence and outstanding Apple distribution requirements: `ios/release/launch-readiness.md`.

- PR #33 added bearer-authenticated self-account deletion at `/api/account`. Real iOS 17 OTP/CRUD/ownership/deletion passed using disposable QA accounts; cascades and cleanup verified.
- Native Decide, Inventory, Cuts, 14-day view, pause/unpause, provider links, Keychain sign-in, optional local reminders, demo preview and deletion are implemented. The app is a free companion; no iOS purchase CTA or external checkout.
- Public `/support` and iOS privacy disclosures deployed and verified. Worker version `e85278d6-c808-4653-8f8c-8c33ec97d360`. Auto-deploy workflow 361594427 remains disabled_manually.
- 110 web tests, TypeScript, targeted lint and OpenNext build pass. Native release archive builds unsigned. Apple account/signing, TestFlight/physical-device validation and review remain outstanding; do not describe this as App Store approved or launch-ready.
- Paddle approval was not rechecked for this task, and no billing secrets changed. Earlier Paddle-status notes above are historical, not a fresh determination.
- Original checkout remains untouched. Work performed in `/Users/Sunil/2026/agents/genesis-ios`.

Release validation follow-up: iPhone Max and iPad native decision and sample journeys verified; six real simulator screenshots saved under `ios/release/screenshots/`. Test selectors handle iPad floating tabs and duplicated confirmation accessibility elements. See the release evidence for run details.

## 28 September 2026 — native Android companion

The native Android app is under `android/` (Kotlin/Compose, min API26, target API36, `app.ritestack.android`). It uses the existing RiteStack Supabase backend and account deletion endpoint, and offers email OTP/password authentication, Decide/Inventory/Cuts, per-row editing, local reminders, account deletion and local sample mode. There is no in-app purchase/checkout flow. Android Keystore protects sessions.

Validation and release boundaries are maintained in `android/release/launch-readiness.md`; Play account setup and publishing steps are in `android/release/play-console-guide.md`. The 16 JVM tests and API34/API36 sample journeys passed, plus a disposable live account lifecycle with verified cleanup. Debug APK and unsigned release AAB build. Google Play account verification, signing, real-device testing, review credentials and the required closed test remain separate launch requirements.

Shared web legal text now supports `/mobile/privacy`, `/mobile/terms`, `/mobile/refund` and `/mobile/support`, with no onward purchase navigation. `/delete-account` provides the public email deletion pathway required by Play. No payment configuration, Supabase project configuration or customer account was changed.

Android implementation merged in PR #36 (`c7045ca`). Mobile policy and deletion pages deployed as Worker `a2330dd7-be02-4bb6-8b0f-718c37ee2992`; all five routes return HTTPS 200 with restricted mobile navigation. Existing homepage remains 200. The existing Cloudflare GitHub deployment workflow remains disabled. Android reminder device validation and final screenshot capture pass; implementation CI run `36440856804` passes.

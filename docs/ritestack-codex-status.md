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

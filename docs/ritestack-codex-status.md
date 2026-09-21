# RiteStack status — 21 September 2026

## Shipped

- PR #29: `/cuts`, free receipts using existing subscriptions and RLS; no migration. All hosted receipt checks passed.
- PR #30: public unsigned homepage with product explanation, unchanged pricing, contact, and legal links. Signed-in home stays Decide. Verified over HTTPS and with JavaScript disabled.
- PR #31: 14-day Decide view, default on. Date-only renewal today through day 14 inclusive, plus paused rows whose existing `remind_at` is in that window. Cuts excluded; switching the chip off restores the original Decide queue. Inventory remains complete.

## Paddle Live

Account: RiteStack, seller 427385, Live dashboard `https://vendors.paddle.com`.

- Account verification: **In progress**; dashboard says its team is reviewing the details, nothing further required now.
- Website: **Pending**. Resubmitted `ritestack.app` after PR #30 removed the public homepage login barrier. Prior email cited unavailable site/SSL/login restrictions. HTTPS verified successfully and the public offer is now readable without a session or JavaScript.
- Product: `pro_01m32bw1m2f1ysxny4fj53kfcp`, RiteStack ritual, Active, Standard digital goods.
- Price: `pri_01m32bxrja7e8ve7p754njp4g7`, $14 USD one-time, `one-time-14`, quantity 1, Active.
- Webhook: `ntfset_01m32cpp07qvnc211tt0ps3075`, Active, Platform API v1, `transaction.completed` and `transaction.paid`, `https://ritestack.app/api/billing/paddle-webhook`.
- API key `RiteStack Live checkout`: Active; Transactions read/write and Client-side tokens read. Founder confirmed private storage. Expires 20 December 2026. No secret values recorded here.
- Live default payment link save has not yet been confirmed as persistent. Recheck `https://ritestack.app/unlock` after website approval.
- Live client token `RiteStack Live checkout`: Active, `ctkn_01m32cxq1rqhpwjcdc205c63rz`. No token value recorded here.
- Payout setup: not yet saved; founder was handed the form for personal and payout details.
- Still needed: approved verification/domain, privately entered webhook secret/API key in Wrangler, saved payout setup, final Live checkout verification.

Production remains **Paddle sandbox**. No Worker billing secrets changed. Do not flip until all Live prerequisites pass. No fake paid grants. The app obtains the client token from the selected Paddle environment through its server API key; no hardcoded token change is required.

## Operations

Worktree: `/Users/Sunil/2026/agents/genesis-wt-cut-receipt-codex`; original genesis checkout left untouched.

GitHub deployment workflow 361594427 remains disabled. Merge each PR, then deploy Worker `ritestack` using OpenNext/Wrangler. Never touch Job Pursuit.

Validation: full lint has 7 existing errors in unrelated auth/form/animation files. Changed-file lint, TypeScript, unit tests, and OpenNext builds pass. Browser tests use dedicated `ritestack-iso-cuts-*@example.invalid` accounts and remove only their rows afterward; entitlement display tests are mocked, not paid grants.

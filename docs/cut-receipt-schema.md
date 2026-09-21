# Cut receipts — schema read, 21 September 2026

Base: origin/main, 64a7eac. No migration required.

- `subscriptions`: `id`, `user_id`, `name`, `monthly_cost`, `renew_date`, `category`, `cancel_url`, `last_used`, `decision`, `remind_at`, `is_sample`, `cut_at`, `created_at`, `updated_at`.
- Status is `decision`, amount is `monthly_cost`, renewal is `renew_date`. `cut_at`, `renew_date`, and `remind_at` are date columns.
- Decide already writes `decision = cut`, `cut_at = today`, clears `remind_at`, and retains the cancel URL. Monthly burn already excludes cuts.
- Receipts use `cut_at` (newest first), never the mutable `updated_at`. Legacy null dates display as not recorded.
- `/cuts` uses the same HostedApp login gate, authenticated fetch, user filter, and Supabase RLS as Inventory. Receipts, including their links, are free to view; creating a cut remains in Decide with the ritual entitlement.
- Entitlement comes from `profiles.trial_ends_at` / `pack_paid_at`; no billing changes.
- Production status before changes: `checkoutProvider=paddle`, `paddleEnv=sandbox`, `stripeMode=null`. GitHub deploy workflow 361594427 remains `disabled_manually`.

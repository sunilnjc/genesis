# RiteStack

You don’t miss the cancel button. You miss a date to decide.

Keep, cut, or pause your AI/dev tool stack — last-used and a cancel URL. The list is inventory. The ritual is the product. This is not a scanner, not Gmail scrape, and not a streaming-cancel app.

**Product:** RiteStack · **URL:** [https://ritestack.app](https://ritestack.app) · **GitHub:** [https://github.com/sunilnjc/genesis](https://github.com/sunilnjc/genesis)

Dark by default (Midday-quiet). Brand marks use each product’s Simple Icons / official hex — not white or `currentColor`. Mobile is a stacked-card app shell with a PWA so you can Add to Home Screen.

Hosted on **Cloudflare** via OpenNext (`@opennextjs/cloudflare`). Wrangler worker name: **`ritestack`**. Not Vercel. Do not reuse Job Pursuit’s Workers, Pages projects, DNS zones, or Supabase.

**Auth:** hosted URLs require a magic-link session. Rows live in a **new** Supabase project (`subscriptions.user_id` + RLS `auth.uid()`). Localhost keeps the on-device list (founder $445 seed) until you sign in. New hosted accounts start **empty** — the founder stack is not a global default.

Magic-link HTML lives in `supabase/templates/` (Job Pursuit layout: one-time code + `{{ .ConfirmationURL }}`). **Sends** from `hello@ritestack.app` via Cloudflare Email Sending (`workers/auth-mail`, Supabase Send Email hook). The link opens `https://ritestack.app/auth/callback?token_hash=…&type=magiclink`; the app calls `verifyOtp` and stores the session in `@supabase/ssr` cookies. PKCE `code` exchange is a same-browser fallback only. Not Job Pursuit.

DNS for sending is on the **ritestack.app** zone only (`cf-bounce` SPF/DKIM/MX + `_dmarc`). Do not touch stackburn or thejobpursuit. Zone DNS API is not writable from Wrangler OAuth — add the records from `node scripts/apply-auth-mail.mjs --templates` notes / the PR if they are missing. Hook secret: `wrangler secret put SEND_EMAIL_HOOK_SECRET` in `workers/auth-mail`, same value on Auth → Hooks. No Resend key is in this repo.

Other agents: import `{ useAuth, getUserId, getSession }` from `@/lib/auth`. `userId` is `auth.uid()`.

`stackburn.app` 301s to `ritestack.app`.

## What it does

- Manual add/edit: name, monthly $, renew date, category, cancel URL
- Last-used as a date you set, or not set
- Keep / cut / pause, with pause reminding in 30 days
- Dashboard: monthly burn, $ cut this pass, decide-by queue
- **Decide** (`/`): only tools that need a keep / cut / pause. **Inventory** (`/inventory`): full list, add/edit, burn. The two lists never render on the same page.
- Default list is the founder’s confirmed tools (not samples): OpenAI Pro+ $200, Cursor Pro $20, Claude $20, Cloudflare workers $10, Twitter (X) $95, CoinGecko $100 — **$445/mo** if all stay active
- Local Simple Icons (and a CoinGecko gecko mark) on matching names, in brand color; unknown tools get a letter, not a fake logo
- Optional extra rows from **Load sample stack** stay labeled **Sample**
- Data: **localhost** uses `localStorage` (founder seed). **Hosted** requires login and loads only that user’s rows from Supabase. No `service_role` in the browser. No Plaid, no auto-cancel.
- **$14 one-time pack** (Stripe Checkout): 7 days of full ritual after signup, then paywall. The list stays free. See [Payments](#payments).

## Run locally

```bash
cd /Users/Sunil/2026/agents/genesis
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317) (use another port if 4317 is already taken)

## Payments

7 days of keep / cut / pause, cancel URLs, and pause reminders after signup. Day 8: paywall until the **$14 one-time** RiteStack pack is paid. Viewing and editing the inventory list stays free. This is Checkout `mode=payment`, not a subscription trial. The optional $6/mo SKU is not wired.

Decide and Inventory do **not** show a pay button while the trial is active. Signed-in testers can open **[/unlock](https://ritestack.app/unlock)** to start $14 Checkout during the trial. That page does not end the 7-day trial for anyone else.

Preview the paywall at `/?preview=paywall` (Decide) or `/inventory?preview=paywall` (Inventory) on localhost.

Checkout uses whatever secret is on the Worker: `sk_test_…` until live secrets are put, then `sk_live_…`. Same lock either way: **7 days full ritual. Then $14 once.** Not a subscription.

### Stripe test mode (local + current Worker)

1. Copy `.env.example` → `.env.local`.
2. Put a **test** secret (`sk_test_…`) from [Stripe Dashboard → test API keys](https://dashboard.stripe.com/test/apikeys) into `.env.local`. Never commit it. Never paste `sk_live_` into chat.
3. `npm run stripe:setup` creates the $14 **test** product/price and a webhook to `https://ritestack.app/api/billing/webhook`. That script refuses live keys.
4. Cloudflare Worker secrets (same names): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. Public var: `NEXT_PUBLIC_APP_URL=https://ritestack.app`. Also: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `FOUNDERS_PAID_EMAIL` (founder notify; leave unset until you have an inbox — do not invent one).
5. Apply `supabase/migrations/20260918190000_profiles_trial.sql` in the RiteStack Supabase project (not Job Pursuit).

### Live Checkout (after Dashboard activate)

Do not put live keys in git or chat. After Stripe live is ready, replace the Worker secrets above with live values (`sk_live_…`, live `price_…`, live `whsec_…`) via `wrangler secret put`. Until those live secrets exist, hosted Checkout stays on test keys. `GET /api/billing/status` reports `stripeMode` as `test` or `live`.

Customer receipt: Checkout sets `receipt_email` from the signed-in address. Also turn on Stripe Dashboard emails for successful payments. Founder ping: webhook `checkout.session.completed` mails `FOUNDERS_PAID_EMAIL` from `hello@ritestack.app` when that secret is set.

### Test cards

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Success (test mode only) |
| `4000 0000 0000 0002` | Decline (test mode only) |
| Any future expiry, any 3-digit CVC, any ZIP | |

Live mode charges a real card. Test cards do not work against `sk_live_`.

### What is gated

| Free | After trial, until $14 |
|---|---|
| Inventory list, add / edit / delete, monthly burn | Keep / cut / pause |
| Decide-by queue **viewing** | Cancel URL links |
| | Pause reminders (30-day) |

SQL: `supabase/migrations/20260918190000_profiles_trial.sql` (`trial_ends_at`, `pack_paid_at`). Grant is webhook (`checkout.session.completed`) or a verified session retrieve on return — never a `?paid=true` query flag.

Copy `.env.example` to `.env.local` with the **ritestack** Supabase URL + anon key (not Job Pursuit). Localhost still runs without those keys.

### Isolation

```bash
npm run isolation
npm run e2e:isolation
```

See [docs/isolation-test.md](docs/isolation-test.md). Two JWTs must not see each other’s `subscriptions`. Playwright hits `https://ritestack.app` with the same `@example.invalid` isolation accounts (no founder inbox). First time: `npx playwright install chromium`.

## Add to Home Screen

RiteStack is a PWA named **RiteStack** (standalone, dark `#101010` icons).

**iPhone / iPad (Safari):** Open the app URL → Share → **Add to Home Screen** → Add.

**Android (Chrome):** Open the app URL → menu → **Install app** / **Add to Home Screen**.

On a phone, bottom tabs switch **Decide** (`/`) and **Inventory** (`/inventory`). Desktop uses the same two tabs in the header. Home never shows the full list; Inventory never shows the keep/cut/pause queue. Old `#inventory` / `#decide` hashes redirect to those routes.

## Deploy on Cloudflare

OpenNext builds a **Worker** named `ritestack` (not Job Pursuit). First-time login:

```bash
npx wrangler login
npm run deploy
```

`npm run deploy` runs `opennextjs-cloudflare build` then `opennextjs-cloudflare deploy`. Production branch is `main`. Bake `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` into the build (`.env.local` locally, GitHub secrets in CI). Never commit `service_role`.

### Dashboard clicks (custom domain)

1. Cloudflare dashboard → **Workers & Pages** → worker **`ritestack`** (not any Job Pursuit worker/project).
2. **Settings → Domains & Routes → Add** → `ritestack.app`.
3. If `ritestack.app` is still on the older Pages project of the same name, remove it there first, then add it to this Worker.
4. Leave Job Pursuit DNS zones alone. Worker **`stackburn-redirect`** 301s `stackburn.app` → `https://ritestack.app`.

GitHub Actions on `main` deploys the same Worker when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repo secrets.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui (Mira / neutral, compact), next-themes (`defaultTheme="dark"`), OpenNext + Cloudflare Workers.

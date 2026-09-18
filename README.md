# RiteStack

You don’t miss the cancel button. You miss a date to decide.

Keep, cut, or pause your AI/dev tool stack — last-used and a cancel URL. The list is inventory. The ritual is the product. This is not a scanner, not Gmail scrape, and not a streaming-cancel app.

**Product:** RiteStack · **URL:** [https://ritestack.app](https://ritestack.app) · **GitHub:** [https://github.com/sunilnjc/genesis](https://github.com/sunilnjc/genesis)

Dark by default (Midday-quiet). Brand marks use each product’s Simple Icons / official hex — not white or `currentColor`. Mobile is a stacked-card app shell with a PWA so you can Add to Home Screen.

Hosted on **Cloudflare** via OpenNext (`@opennextjs/cloudflare`). Wrangler worker name: **`ritestack`**. Not Vercel. Do not reuse Job Pursuit’s Workers, Pages projects, DNS zones, or Supabase. Data is still `localStorage` until a *new* Supabase exists. `stackburn.app` will 301 → ritestack.app later.

## What it does

- Manual add/edit: name, monthly $, renew date, category, cancel URL
- Last-used as a date you set, or not set
- Keep / cut / pause, with pause reminding in 30 days
- Dashboard: monthly burn, $ cut this pass, decide-by queue
- **Decide** (home): only tools that need a keep / cut / pause. **Inventory**: full list, add/edit, burn. Same row never on both screens at once.
- Default list is the founder’s confirmed tools (not samples): OpenAI Pro+ $200, Cursor Pro $20, Claude $20, Cloudflare workers $10, Twitter (X) $95, CoinGecko $100 — **$445/mo** if all stay active
- Local Simple Icons (and a CoinGecko gecko mark) on matching names, in brand color; unknown tools get a letter, not a fake logo
- Optional extra rows from **Load sample stack** stay labeled **Sample**
- Data stays in the browser (`localStorage`). No auth, no Plaid, no auto-cancel.

## Run locally

```bash
cd /Users/Sunil/2026/agents/genesis
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317)

## Add to Home Screen

RiteStack is a PWA named **RiteStack** (standalone, dark `#101010` icons).

**iPhone / iPad (Safari):** Open the app URL → Share → **Add to Home Screen** → Add.

**Android (Chrome):** Open the app URL → menu → **Install app** / **Add to Home Screen**.

On a phone you’ll get Decide (home, fat Keep / Cut / Pause) and Inventory (list + burn) as two tabs. Desktop uses the same two tabs. Same subscription never appears twice on one screen.

## Deploy on Cloudflare

OpenNext builds a **Worker** named `ritestack` (not Job Pursuit). First-time login:

```bash
npx wrangler login
npm run deploy
```

`npm run deploy` runs `opennextjs-cloudflare build` then `opennextjs-cloudflare deploy`. Production branch is `main`.

### Dashboard clicks (custom domain)

1. Cloudflare dashboard → **Workers & Pages** → worker **`ritestack`** (not any Job Pursuit worker/project).
2. **Settings → Domains & Routes → Add** → `ritestack.app`.
3. If `ritestack.app` is still on the older Pages project of the same name, remove it there first, then add it to this Worker.
4. Leave Job Pursuit DNS zones alone. **stackburn.app** stays a later 301 to ritestack.app — do not attach it yet.

GitHub Actions on `main` deploys the same Worker when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repo secrets.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui (Mira / neutral, compact), next-themes (`defaultTheme="dark"`), OpenNext + Cloudflare Workers.

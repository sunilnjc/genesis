# RiteStack

You don’t miss the cancel button. You miss a date to decide.

Keep, cut, or pause your AI/dev tool stack — last-used and a cancel URL. The list is inventory. The ritual is the product. This is not a scanner, not Gmail scrape, and not a streaming-cancel app.

**Product:** RiteStack · **URL:** [https://ritestack.app](https://ritestack.app) · **GitHub:** [https://github.com/sunilnjc/genesis](https://github.com/sunilnjc/genesis)

Dark by default (Midday-quiet). Brand marks use each product’s Simple Icons / official hex — not white or `currentColor`. Mobile is a stacked-card app shell with a PWA so you can Add to Home Screen.

Hosted on **Cloudflare Pages** (project `ritestack`). Not Vercel. `stackburn.app` will 301 here later.

## What it does

- Manual add/edit: name, monthly $, renew date, category, cancel URL
- Last-used as a date you set, or not set
- Keep / cut / pause, with pause reminding in 30 days
- Dashboard: monthly burn, $ cut this pass, decide-by queue
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

On a phone you’ll get burn at the top, stacked cards, huge Keep / Cut / Pause, and Add at the bottom. Desktop still uses the denser table.

## Deploy (Cloudflare Pages)

Static export → Pages project **`ritestack`**.

```bash
npm run deploy
```

Needs Wrangler logged in (`npx wrangler login`). Production branch is `main`. Custom domain `ritestack.app` is attached on the Pages project; `stackburn.app` stays a later redirect.

## Stack

Next.js (static export), TypeScript, Tailwind CSS, shadcn/ui (Mira / neutral, compact), next-themes (`defaultTheme="dark"`), Cloudflare Pages.

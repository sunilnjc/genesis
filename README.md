# Genesis

You don’t miss the cancel button. You miss a date to decide.

Keep, cut, or pause your AI/dev tool stack — last-used and a cancel URL. The list is inventory. The ritual is the product. This is not a scanner, not Gmail scrape, and not a streaming-cancel app.

**GitHub:** [https://github.com/sunilnjc/genesis](https://github.com/sunilnjc/genesis)

Dark by default (Midday-quiet). Brand marks use each product’s Simple Icons / official hex — not white or `currentColor`. Mobile is a stacked-card app shell with a PWA so you can Add to Home Screen.

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

Genesis is a PWA named **Genesis** (standalone, dark `#101010` icons).

**iPhone / iPad (Safari):** Open [http://127.0.0.1:4317](http://127.0.0.1:4317) → Share → **Add to Home Screen** → Add. (Use your Mac/phone’s LAN URL if you are not on this machine.)

**Android (Chrome):** Open the same URL → menu → **Install app** / **Add to Home Screen**.

On a phone you’ll get burn at the top, stacked cards, huge Keep / Cut / Pause, and Add at the bottom. Desktop still uses the denser table.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui (Mira / neutral, compact), next-themes (`defaultTheme="dark"`).

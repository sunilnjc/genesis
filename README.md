# Genesis

You don’t miss the cancel button. You miss a date to decide.

Keep, cut, or pause your AI/dev tool stack — last-used and a cancel URL. The list is inventory. The ritual is the product. This is not a scanner, not Gmail scrape, and not a streaming-cancel app.

**GitHub:** [https://github.com/sunilnjc/genesis](https://github.com/sunilnjc/genesis)

Dark by default (Midday-quiet). Brand marks follow the page foreground so they stay readable on dark, and on light if a theme toggle is added later.

## What it does

- Manual add/edit: name, monthly $, renew date, category, cancel URL
- Last-used as a date you set, or not set
- Keep / cut / pause, with pause reminding in 30 days
- Dashboard: monthly burn, $ cut this pass, decide-by queue
- Default list is the founder’s confirmed tools (not samples): OpenAI Pro+ $200, Cursor Pro $20, Claude $20, Cloudflare workers $10, Twitter (X) $95, CoinGecko $100 — **$445/mo** if all stay active
- Local Simple Icons (and a CoinGecko gecko mark) on matching names; unknown tools get a letter, not a fake logo
- Optional extra rows from **Load sample stack** stay labeled **Sample**
- Data stays in the browser (`localStorage`). No auth, no Plaid, no auto-cancel.

## Run locally

```bash
cd /Users/Sunil/2026/agents/genesis
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui (Mira / neutral, compact), next-themes (`defaultTheme="dark"`).

# Subscription Graveyard

You don’t miss the cancel button. You miss a date to decide.

A keep / cut / pause ritual for people drowning in AI and indie-SaaS line items. The list is inventory. The ritual is the product.

This repo is named **genesis**. The product is Subscription Graveyard.

**GitHub:** [https://github.com/sunilnjc/genesis](https://github.com/sunilnjc/genesis)

## What it does

- Manual add/edit: name, monthly $, renew date, category, cancel URL
- Last-used as a date you set, or **unknown**
- Keep / cut / pause, with pause reminding in 30 days
- Dashboard: monthly burn, $ cut this pass, decide-by queue
- Sample AI-tool stack (Cursor, ChatGPT, Vercel, Notion, Figma, Linear, hosting, domain) — clearly labeled **Sample**
- Data stays in the browser (`localStorage`). No auth, no Plaid, no auto-cancel.

## Run locally

```bash
cd /Users/Sunil/2026/agents/genesis
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui (Mira / neutral, compact).

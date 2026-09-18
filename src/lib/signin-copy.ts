/** Unsigned hosted sign-in story. Keep founder seed names/prices out of this file. */

export const SIGNIN_BRAND = "RiteStack"

export const SIGNIN_HEADLINE =
  "You don’t miss the cancel button. You miss a date to decide."

export const SIGNIN_LEDE =
  "If you run an AI and indie-SaaS stack, you already know the names — Cursor, ChatGPT, Vercel, Notion, Figma, Linear, hosting, domains, plus whatever billed itself last month. You do not need a bank feed to find them. You need a sitting, before another seat renews, where you actually keep, cut, or pause."

export const SIGNIN_PROBLEM_TITLE = "The problem"
export const SIGNIN_PROBLEM =
  "Tool sprawl on a developer stack is quiet. Last-used goes stale. The cancel URL lives in a settings page you never open. Monthly burn creeps because there was never a decide-by date, only a list. A spreadsheet can hold inventory. It will not make you choose. Consumer cancel apps hunt gyms and streaming. This is for the stack you can already name."

export const SIGNIN_RITUAL_TITLE = "The ritual"
export const SIGNIN_RITUAL =
  "Add tools by hand: name, monthly dollars, renew date, category, cancel URL, and last-used — or mark last-used unknown. Do not pretend an integration watched you open the app. Weekly glance, monthly decision. Open Decide: renewing soon, last-used unknown, or last-used stale. One action per row. Keep snoozes until the next renew. Cut opens the cancel URL and drops burn. Pause reminds you in 30 days. If the sitting does not end in decisions, it failed."

export const SIGNIN_WALKAWAY_TITLE = "What you walk away with"
export const SIGNIN_WALKAWAY =
  "An honest monthly burn. Dollars cut this pass. A decide-by queue instead of a prettier spreadsheet. Brand marks so the list is scannable on a phone. Your own rows only — never someone else’s notebook, and never a seeded demo stack. New accounts start empty. You add what you actually pay for."

export const SIGNIN_SPLIT_TITLE = "Decide is not Inventory"
export const SIGNIN_SPLIT =
  "Inventory is the full list: add, edit, burn, brand marks. Decide is only the rows that need a keep / cut / pause. They never share a page. The list is inventory. The ritual is the product."

export const SIGNIN_ACCESS_TITLE = "Seven days, then $14 once"
export const SIGNIN_ACCESS =
  "Sign in with a magic link to this device. You get seven days of the full ritual — decide-by, keep / cut / pause, cancel URLs, pause reminders. Day 8, that surface waits on a $14 one-time pack. The list can stay free. This is not a subscription. Not a Gmail scan, not a bank sync, not auto-cancel, and not subscriptiongraveyard.com."

export const SIGNIN_FORM_TITLE = "Email a sign-in link"
export const SIGNIN_FORM_HINT =
  "Each signed-in account sees only its own tools. Unsigned visitors see this page — not a shared list."
export const SIGNIN_FORM_SENT = "Open the link on this device. If nothing arrives, check spam."
export const SIGNIN_FORM_PENDING = "Checking whether you already have a session…"
export const SIGNIN_FORM_SUBMIT = "Email me a sign-in link"
export const SIGNIN_FORM_SENDING = "Sending link…"

export const SIGNIN_ACTIONS = [
  {
    name: "Keep",
    meaning: "Still earning its seat. Snooze until the next renew.",
  },
  {
    name: "Cut",
    meaning: "Open the cancel URL, mark it cut, watch burn drop.",
  },
  {
    name: "Pause",
    meaning: "Not tonight. Remind you in 30 days.",
  },
] as const

export const SIGNIN_ROW_LEGEND = [
  "Name",
  "$ / mo",
  "Renew date",
  "Last-used or unknown",
  "Cancel URL",
] as const

/** Strings that must never appear on the unsigned hosted page (founder notebook). */
export const SIGNIN_FORBIDDEN_SEED = [
  "OpenAI Pro+",
  "Cursor Pro",
  "CoinGecko",
  "Twitter (X)",
  "$445",
  "$200",
] as const

export function allSigninCopy(): string {
  return [
    SIGNIN_BRAND,
    SIGNIN_HEADLINE,
    SIGNIN_LEDE,
    SIGNIN_PROBLEM_TITLE,
    SIGNIN_PROBLEM,
    SIGNIN_RITUAL_TITLE,
    SIGNIN_RITUAL,
    SIGNIN_WALKAWAY_TITLE,
    SIGNIN_WALKAWAY,
    SIGNIN_SPLIT_TITLE,
    SIGNIN_SPLIT,
    SIGNIN_ACCESS_TITLE,
    SIGNIN_ACCESS,
    SIGNIN_FORM_TITLE,
    SIGNIN_FORM_HINT,
    SIGNIN_FORM_SENT,
    SIGNIN_FORM_PENDING,
    SIGNIN_FORM_SUBMIT,
    SIGNIN_ACTIONS.map((action) => `${action.name} ${action.meaning}`).join(" "),
    SIGNIN_ROW_LEGEND.join(" "),
  ].join("\n")
}

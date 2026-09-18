/** Compact unsigned login copy. Keep founder seed names/prices out of this file. */

export const SIGNIN_BRAND = "RiteStack"
export const SIGNIN_HEADLINE = "Sign in to your stack"
export const SIGNIN_CONTEXT =
  "Keep, cut, or pause the AI and dev tools you pay for. Magic link only — each account sees only its own list."

/** Strings that must never appear on the unsigned hosted page (founder notebook). */
export const SIGNIN_FORBIDDEN_SEED = [
  "OpenAI Pro+",
  "Cursor Pro",
  "CoinGecko",
  "Twitter (X)",
  "$445",
  "$200",
] as const

export const SIGNIN_FORBIDDEN_STORY = [
  "The problem",
  "The ritual",
  "What you walk away with",
  "Decide is not Inventory",
  "Seven days, then $14 once",
  "You don’t miss the cancel button",
] as const

export function allSigninCopy(): string {
  return [SIGNIN_BRAND, SIGNIN_HEADLINE, SIGNIN_CONTEXT].join("\n")
}

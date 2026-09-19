import { PACK_AMOUNT_DOLLARS } from "./entitlement.ts"
import { sendRiteStackMail } from "./ritestack-mail.ts"
import type { PaidCheckout } from "./stripe.ts"

export type PaidNotifyMode = "paddle-live" | "paddle-sandbox" | "stripe-test"

/** One founder inbox. Empty / invalid means skip notify — never invent an address. */
export function readFoundersPaidEmail(env: NodeJS.Dict<string> = process.env): string | null {
  const raw = (env.FOUNDERS_PAID_EMAIL ?? "").trim()
  if (!raw) return null
  if (raw.length > 200) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null
  return raw
}

export function foundersPaidNotify(input: {
  paid: PaidCheckout
  mode: PaidNotifyMode
}): { subject: string; text: string } {
  const label =
    input.mode === "paddle-live"
      ? "paddle live"
      : input.mode === "paddle-sandbox"
        ? "paddle sandbox"
        : "stripe test"
  const who = input.paid.email?.trim() || "(no customer email on the session)"
  return {
    subject: `RiteStack pack paid · $${PACK_AMOUNT_DOLLARS} ${label}`,
    text: [
      "Someone paid the RiteStack pack.",
      `Mode: ${label}`,
      `Amount: $${PACK_AMOUNT_DOLLARS} once`,
      `Customer: ${who}`,
      `User id: ${input.paid.userId}`,
      `Checkout: ${input.paid.sessionId}`,
      "",
      "7 days full ritual. Then $14 once.",
    ].join("\n"),
  }
}

export async function notifyFoundersPaid(
  paid: PaidCheckout,
  mode: PaidNotifyMode,
  env: NodeJS.Dict<string> = process.env
): Promise<boolean> {
  const to = readFoundersPaidEmail(env)
  if (!to) return false
  const mail = foundersPaidNotify({ paid, mode })
  return sendRiteStackMail({ to, ...mail })
}

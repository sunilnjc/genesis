import { PACK_AMOUNT_DOLLARS } from "./entitlement.ts"
import { sendRiteStackMail } from "./ritestack-mail.ts"
import type { PaidCheckout, StripeMode } from "./stripe.ts"

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
  stripeMode: StripeMode
}): { subject: string; text: string } {
  const mode = input.stripeMode
  const who = input.paid.email?.trim() || "(no customer email on the session)"
  return {
    subject: `RiteStack pack paid · $${PACK_AMOUNT_DOLLARS} ${mode}`,
    text: [
      "Someone paid the RiteStack pack.",
      `Mode: ${mode}`,
      `Amount: $${PACK_AMOUNT_DOLLARS} once`,
      `Customer: ${who}`,
      `User id: ${input.paid.userId}`,
      `Checkout session: ${input.paid.sessionId}`,
      "",
      "7 days full ritual. Then $14 once.",
    ].join("\n"),
  }
}

export async function notifyFoundersPaid(
  paid: PaidCheckout,
  stripeMode: StripeMode,
  env: NodeJS.Dict<string> = process.env
): Promise<boolean> {
  const to = readFoundersPaidEmail(env)
  if (!to) return false
  const mail = foundersPaidNotify({ paid, stripeMode })
  return sendRiteStackMail({ to, ...mail })
}

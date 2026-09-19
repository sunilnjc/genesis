import { applyPaidCheckout } from "@/lib/billing-server"
import { notifyFoundersPaid } from "@/lib/founders-paid"
import { paidCheckoutFromSession, readStripeConfig, verifyStripeWebhook } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const raw = await request.text()
  let config
  try {
    config = readStripeConfig()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe is not configured."
    return Response.json({ error: message }, { status: 503 })
  }

  if (!config.webhookSecret) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set. Webhooks are ignored until it is." },
      { status: 503 }
    )
  }

  const header = request.headers.get("stripe-signature") ?? ""
  const ok = await verifyStripeWebhook(raw, header, config.webhookSecret)
  if (!ok) {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 })
  }

  let event: { type?: string; data?: { object?: unknown } }
  try {
    event = JSON.parse(raw) as { type?: string; data?: { object?: unknown } }
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const paid = paidCheckoutFromSession(event.data?.object)
    if (paid) {
      await applyPaidCheckout(paid)
      try {
        await notifyFoundersPaid(paid, config.stripeMode)
      } catch {
        // Pack grant already persisted. Founder mail is best-effort.
      }
    }
  }

  return Response.json({ received: true })
}

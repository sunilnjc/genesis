import { applyPaidCheckout } from "@/lib/billing-server"
import { notifyFoundersPaid } from "@/lib/founders-paid"
import { handlePaddleWebhook, readPaddleConfig } from "@/lib/paddle"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const raw = await request.text()
  const header = request.headers.get("paddle-signature") ?? ""
  const result = await handlePaddleWebhook(raw, header)
  if (result.paid) {
    await applyPaidCheckout(result.paid)
    try {
      const mode = readPaddleConfig().env === "live" ? "paddle-live" : "paddle-sandbox"
      await notifyFoundersPaid(result.paid, mode)
    } catch {
      // Pack grant already persisted. Founder mail is best-effort.
    }
  }
  return Response.json(result.body, { status: result.status })
}

import { startCheckout, withCookies } from "@/lib/billing-server"
import { StripeConfigError } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { url, setCookies } = await startCheckout(request)
    return withCookies(Response.json({ url }), setCookies)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Checkout."
    const status = error instanceof StripeConfigError ? 503 : 400
    return Response.json({ error: message }, { status })
  }
}

import { startCheckout, withCookies } from "@/lib/billing-server"
import { PaddleConfigError } from "@/lib/paddle"
import { StripeConfigError } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { url, provider, overlay, setCookies } = await startCheckout(request)
    return withCookies(Response.json({ url, provider, overlay }), setCookies)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Checkout."
    const status =
      error instanceof StripeConfigError || error instanceof PaddleConfigError ? 503 : 400
    return Response.json({ error: message }, { status })
  }
}

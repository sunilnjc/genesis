import { billingStatus, withCookies } from "@/lib/billing-server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { status, setCookies } = await billingStatus(request)
    return withCookies(Response.json(status), setCookies)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load billing status."
    return Response.json({ error: message }, { status: 500 })
  }
}

import { lookupCancelUrl } from "@/lib/cancel-lookup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * POST /api/cancel-lookup
 * Body: { name: string } — the name the customer typed or selected.
 * Returns: { url: string | null, source: "catalog" | "lookup" | null }
 *
 * Catalog hit is immediate. Lookup is a server search the add form can fire
 * in the background without blocking Add. Never invents a URL.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse("Expected JSON body { name: string }.")
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Expected JSON body { name: string }.")
  }

  const name = (body as { name?: unknown }).name
  if (typeof name !== "string") {
    return errorResponse("name must be a string.")
  }

  const query = name.trim()
  if (!query) {
    return errorResponse("name is required.")
  }

  const result = await lookupCancelUrl(query)
  return Response.json(result)
}

export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } })
}

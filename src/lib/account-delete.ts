/** Bearer-only endpoint: cookies never authorize destructive account operations. */
export async function deleteOwnAccount(request: Request, config: {
  url: string
  anonKey: string
  serviceRoleKey: string | null
}, transport: typeof fetch = fetch): Promise<Response> {
  const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } })
  const authorization = request.headers.get("authorization") ?? ""
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ error: "Sign in to delete your account." }, 401)
  if (request.headers.get("x-ritestack-confirm") !== "delete-account") return json({ error: "Explicit deletion confirmation required." }, 400)
  if (!config.serviceRoleKey || new URL(config.url).hostname !== "gmbretmepjxrsmuxvpbn.supabase.co") {
    return json({ error: "Account deletion is temporarily unavailable." }, 503)
  }
  try {
    const verified = await transport(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: authorization }, cache: "no-store",
    })
    if (!verified.ok) return json({ error: "Sign in again before deleting your account." }, verified.status >= 500 ? 503 : 401)
    const user = await verified.json() as { id?: unknown }
    if (typeof user.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      return json({ error: "Could not verify your account." }, 401)
    }
    // Never accept an ID from the request body. Existing FK cascades remove this user's rows.
    const deleted = await transport(`${config.url}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE", headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` },
    })
    if (!deleted.ok) return json({ error: "Deletion did not complete. Please retry." }, 502)
    return json({ deleted: true }, 200)
  } catch { return json({ error: "Deletion could not be confirmed. Please retry or contact support." }, 503) }
}

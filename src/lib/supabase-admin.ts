/** Minimal Supabase Auth + REST. No SDK — the auth branch can swap this later. */

export type AuthUser = {
  id: string
  email: string | null
}

export type ProfileRow = {
  id: string
  trial_ends_at: string
  pack_paid_at: string | null
  stripe_customer_id: string | null
  stripe_checkout_session_id: string | null
}

export type SupabaseConfig = {
  url: string
  anonKey: string
  serviceRoleKey: string | null
}

export function readSupabaseConfig(env: NodeJS.Dict<string> = process.env): SupabaseConfig | null {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "").trim().replace(/\/$/, "")
  const anonKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "").trim()
  if (!url || !anonKey) return null
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() || null
  return { url, anonKey, serviceRoleKey }
}

function restHeaders(config: SupabaseConfig, jwt: string, extra?: Record<string, string>) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    ...extra,
  }
}

export async function authUserFromJwt(config: SupabaseConfig, jwt: string): Promise<AuthUser | null> {
  if (!jwt) return null
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: restHeaders(config, jwt),
  })
  if (!response.ok) return null
  const body = (await response.json()) as { id?: unknown; email?: unknown }
  if (typeof body.id !== "string" || !body.id) return null
  return { id: body.id, email: typeof body.email === "string" ? body.email : null }
}

export async function ensureOwnProfile(
  config: SupabaseConfig,
  jwt: string
): Promise<ProfileRow | null> {
  const response = await fetch(`${config.url}/rest/v1/rpc/ensure_own_profile`, {
    method: "POST",
    headers: restHeaders(config, jwt),
    body: "{}",
  })
  if (!response.ok) return null
  const body = (await response.json()) as ProfileRow | ProfileRow[] | null
  const row = Array.isArray(body) ? body[0] : body
  if (!row || typeof row.id !== "string" || typeof row.trial_ends_at !== "string") return null
  return {
    id: row.id,
    trial_ends_at: row.trial_ends_at,
    pack_paid_at: row.pack_paid_at ?? null,
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_checkout_session_id: row.stripe_checkout_session_id ?? null,
  }
}

export async function markProfilePaid(
  config: SupabaseConfig,
  paid: {
    userId: string
    sessionId: string
    customerId: string | null
    paidAt: string
  }
): Promise<boolean> {
  if (!config.serviceRoleKey) return false
  const response = await fetch(
    `${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(paid.userId)}&pack_paid_at=is.null`,
    {
      method: "PATCH",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        pack_paid_at: paid.paidAt,
        stripe_checkout_session_id: paid.sessionId,
        stripe_customer_id: paid.customerId,
        updated_at: paid.paidAt,
      }),
    }
  )
  return response.ok
}

/**
 * Mint a hosted RiteStack session without sending mail.
 * Admin-created @example.invalid user + generateLink / verifyOtp.
 * Never the founder inbox. Never Job Pursuit Supabase.
 */
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const JOB_PURSUIT_REF = "vhjwzxcgkmxvrmfstzpy"
export const RITESTACK_REF = "gmbretmepjxrsmuxvpbn"
export const HOSTED = (process.env.RITESTACK_E2E_BASE_URL ?? "https://ritestack.app").replace(
  /\/$/,
  ""
)

const here = dirname(fileURLToPath(import.meta.url))

export type CancelUrlAccountMeta = {
  email: string
  userId: string
  stamp: number
  storageKey: string
}

export type LookupProbe = {
  live: boolean
  path: string
  status: number
  contentType: string
}

function loadEnvLocal() {
  const path = resolve(here, "../../.env.local")
  if (!existsSync(path)) {
    throw new Error(
      "Need genesis .env.local (RiteStack URL + anon + service role). Copy it; do not commit it."
    )
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

export function ritestackEnv() {
  loadEnvLocal()
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !anon || !service) {
    throw new Error(
      "Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    )
  }
  if (url.includes(JOB_PURSUIT_REF) || url.includes("the-job-pursuit")) {
    throw new Error("Refusing Job Pursuit Supabase. RiteStack e2e uses gmbretmepjxrsmuxvpbn only.")
  }
  if (!url.includes(RITESTACK_REF)) {
    throw new Error("Expected the RiteStack Supabase project ref.")
  }
  return { url, anon, service }
}

export function adminClient(): SupabaseClient {
  const { url, service } = ritestackEnv()
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function sessionPayload(session: Session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type ?? "bearer",
    user: session.user,
  }
}

async function mintSessionViaMagicLink(
  admin: SupabaseClient,
  url: string,
  anon: string,
  email: string,
  password: string
): Promise<Session> {
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${HOSTED}/auth/callback` },
  })
  const hashed =
    link?.properties?.hashed_token ??
    (link as { hashed_token?: string } | null)?.hashed_token

  if (!linkError && hashed) {
    const { data: verified, error: verifyError } = await anonClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashed,
    })
    if (!verifyError && verified.session) return verified.session
  }

  const { data: passwordData, error: passwordError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })
  if (passwordError || !passwordData.session) {
    throw new Error(
      `Could not mint a test session: ${passwordError?.message ?? linkError?.message ?? "unknown"}`
    )
  }
  return passwordData.session
}

export async function probeLookup(baseURL = HOSTED): Promise<LookupProbe> {
  const paths = ["/api/cancel-lookup", "/api/cancel-url/lookup"]
  let last: LookupProbe = {
    live: false,
    path: paths[0],
    status: 0,
    contentType: "",
  }
  for (const path of paths) {
    const response = await fetch(`${baseURL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Cursor" }),
    })
    const contentType = response.headers.get("content-type") ?? ""
    last = { live: false, path, status: response.status, contentType }
    if (response.ok && contentType.includes("json")) {
      return { live: true, path, status: response.status, contentType }
    }
  }
  return last
}

export async function createCancelUrlAccount(): Promise<{
  meta: CancelUrlAccountMeta
  session: ReturnType<typeof sessionPayload>
}> {
  const { url, anon } = ritestackEnv()
  const admin = adminClient()
  const stamp = Date.now()
  const email = `e2e-c-${stamp}@example.invalid`
  const password = `E2e_${stamp}_Aa1!`

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`create cancel-url e2e user: ${createError?.message}`)
  }

  const trialEnds = new Date(Date.now() + 6 * 86_400_000).toISOString()
  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    trial_ends_at: trialEnds,
  })
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    throw new Error(`ensure trial profile: ${profileError.message}`)
  }

  const session = await mintSessionViaMagicLink(admin, url, anon, email, password)
  const projectRef = new URL(url).hostname.split(".")[0]

  return {
    meta: {
      email,
      userId: created.user.id,
      stamp,
      storageKey: `sb-${projectRef}-auth-token`,
    },
    session: sessionPayload(session),
  }
}

export async function deleteCancelUrlUser(userId: string) {
  const admin = adminClient()
  await admin.from("subscriptions").delete().eq("user_id", userId)
  await admin.from("profiles").delete().eq("id", userId)
  await admin.auth.admin.deleteUser(userId)
}

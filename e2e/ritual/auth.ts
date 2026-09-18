/**
 * Mint a hosted RiteStack session without sending mail.
 * Reuses the isolation-test pattern: admin-created @example.invalid users +
 * generateLink / verifyOtp (magic link, no inbox). Never the founder Gmail.
 */
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const JOB_PURSUIT_REF = "vhjwzxcgkmxvrmfstzpy"
export const RITESTACK_REF = "gmbretmepjxrsmuxvpbn"

const here = dirname(fileURLToPath(import.meta.url))

export type RitualAccountMeta = {
  email: string
  userId: string
  otherUserId: string
  secretName: string
  stamp: number
  storageKey: string
}

function loadEnvLocal() {
  const path = resolve(here, "../../.env.local")
  if (!existsSync(path)) {
    throw new Error("Need genesis .env.local (RiteStack URL + anon + service role). Copy it; do not commit it.")
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
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.")
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
    options: { redirectTo: "https://ritestack.app/auth/callback" },
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
    throw new Error(`Could not mint a test session: ${passwordError?.message ?? linkError?.message ?? "unknown"}`)
  }
  return passwordData.session
}

export async function createRitualAccount(): Promise<{
  meta: RitualAccountMeta
  session: ReturnType<typeof sessionPayload>
}> {
  const { url, anon } = ritestackEnv()
  const admin = adminClient()
  const stamp = Date.now()
  const email = `e2e-r-${stamp}@example.invalid`
  const otherEmail = `e2e-o-${stamp}@example.invalid`
  const password = `E2e_${stamp}_Aa1!`

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`create ritual user: ${createError?.message}`)
  }

  const { data: other, error: otherError } = await admin.auth.admin.createUser({
    email: otherEmail,
    password,
    email_confirm: true,
  })
  if (otherError || !other.user) {
    await admin.auth.admin.deleteUser(created.user.id)
    throw new Error(`create isolation user: ${otherError?.message}`)
  }

  const trialEnds = new Date(Date.now() + 6 * 86_400_000).toISOString()
  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    trial_ends_at: trialEnds,
  })
  if (profileError) {
    throw new Error(`ensure trial profile: ${profileError.message}`)
  }

  const secretName = `SECRET_ISOLATION_${stamp}`
  const { error: secretError } = await admin.from("subscriptions").insert({
    id: crypto.randomUUID(),
    user_id: other.user.id,
    name: secretName,
    monthly_cost: 200,
    renew_date: "2026-10-01",
    category: "AI",
    cancel_url: "https://example.com/not-yours",
    last_used: null,
    decision: "undecided",
    remind_at: null,
    is_sample: false,
    cut_at: null,
  })
  if (secretError) {
    throw new Error(`seed other-user row: ${secretError.message}`)
  }

  const session = await mintSessionViaMagicLink(admin, url, anon, email, password)
  const projectRef = new URL(url).hostname.split(".")[0]

  return {
    meta: {
      email,
      userId: created.user.id,
      otherUserId: other.user.id,
      secretName,
      stamp,
      storageKey: `sb-${projectRef}-auth-token`,
    },
    session: sessionPayload(session),
  }
}

export async function deleteRitualUsers(userId: string, otherUserId: string) {
  const admin = adminClient()
  await admin.from("subscriptions").delete().in("user_id", [userId, otherUserId])
  await admin.from("profiles").delete().in("id", [userId, otherUserId])
  await admin.auth.admin.deleteUser(userId)
  await admin.auth.admin.deleteUser(otherUserId)
}

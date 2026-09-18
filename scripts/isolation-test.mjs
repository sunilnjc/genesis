#!/usr/bin/env node
/**
 * Two-user isolation proof for RiteStack Supabase + helpers for Playwright.
 *
 * Requires .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (script only — never shipped to the browser)
 *
 * Reuses ritestack-iso-*@example.invalid accounts. Never the founder inbox.
 * Refuses Job Pursuit’s project ref.
 */
import { createClient } from "@supabase/supabase-js"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export const JOB_PURSUIT_REF = "vhjwzxcgkmxvrmfstzpy"
export const HOSTED_ORIGIN = "https://ritestack.app"
export const LOCAL_SEED_KEY = "subscription-graveyard.v1"
export const DEFAULT_ISO_A_EMAIL = "ritestack-iso-a@example.invalid"
export const DEFAULT_ISO_B_EMAIL = "ritestack-iso-b@example.invalid"

/** Visible founder-row names. Login copy may mention $445; do not use that as a leak marker. */
export const FOUNDER_ROW_NAMES = [
  "OpenAI Pro+",
  "Cursor Pro",
  "Claude",
  "Cloudflare workers",
  "Twitter (X)",
  "CoinGecko",
]

export function loadEnvLocal() {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(here, "../.env.local"),
    resolve(process.cwd(), "../../.env.local"),
  ]
  const seen = new Set()
  for (const path of candidates) {
    if (seen.has(path) || !existsSync(path)) continue
    seen.add(path)
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
}

export function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

export function assertSafeTestEmail(email, label) {
  const value = (email ?? "").trim().toLowerCase()
  if (!value) fail(`${label} email is empty`)
  if (value.includes("gmail.com") || value.includes("googlemail.com") || value.includes("kalabandi")) {
    fail(`${label}: refusing a real inbox. Reuse ${DEFAULT_ISO_A_EMAIL} / ${DEFAULT_ISO_B_EMAIL}.`)
  }
  if (!value.endsWith("@example.invalid") || !value.startsWith("ritestack-iso-")) {
    fail(`${label}: isolation accounts must be ritestack-iso-*@example.invalid (no magic-link mail).`)
  }
}

export function hostedOrigin() {
  const raw = (process.env.RITESTACK_E2E_BASE_URL ?? HOSTED_ORIGIN).trim().replace(/\/$/, "")
  return raw || HOSTED_ORIGIN
}

export function readRiteStackEnv() {
  loadEnvLocal()
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !anon || !service) {
    fail("Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local")
  }
  if (url.includes(JOB_PURSUIT_REF) || url.includes("the-job-pursuit")) {
    fail("Refusing Job Pursuit Supabase. Create a new ritestack project.")
  }
  return { url, anon, service }
}

export function projectRefFromUrl(url) {
  return new URL(url).hostname.split(".")[0]
}

export function authStorageKey(url) {
  return `sb-${projectRefFromUrl(url)}-auth-token`
}

export function founderSeedPoison() {
  const stamp = "2026-01-01T00:00:00.000Z"
  return JSON.stringify({
    version: 1,
    seedVersion: 5,
    subscriptions: FOUNDER_ROW_NAMES.map((name, index) => ({
      id: `poison-${index}`,
      name,
      monthlyCost: name === "OpenAI Pro+" ? 200 : 20,
      renewDate: "2026-10-01",
      category: "AI",
      cancelUrl: "https://example.invalid/cancel",
      lastUsed: null,
      decision: "undecided",
      remindAt: null,
      isSample: false,
      cutAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })),
  })
}

export function isoEmails() {
  const userAEmail = (process.env.RITESTACK_ISO_A_EMAIL ?? DEFAULT_ISO_A_EMAIL).trim()
  const userBEmail = (process.env.RITESTACK_ISO_B_EMAIL ?? DEFAULT_ISO_B_EMAIL).trim()
  assertSafeTestEmail(userAEmail, "User A")
  assertSafeTestEmail(userBEmail, "User B")
  if (userAEmail === userBEmail) fail("User A and User B must be different test emails.")
  return { userAEmail, userBEmail }
}

function adminClient(url, service) {
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function anonClient(url, anon) {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function ensureIsoUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (!error && data.user) return data.user

  const message = (error?.message ?? "").toLowerCase()
  const already = message.includes("already") || message.includes("registered") || error?.status === 422
  if (!already) {
    throw new Error(`create user ${email}: ${error?.message ?? "unknown error"}`)
  }

  for (let page = 1; page <= 20; page += 1) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (listError) throw new Error(`list users: ${listError.message}`)
    const found = listed.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
      })
      if (updateError) throw new Error(`update user ${email}: ${updateError.message}`)
      return found
    }
    if (listed.users.length < 200) break
  }
  throw new Error(`user ${email} already exists but was not listed`)
}

export async function wipeIsoRows(admin, userIds) {
  if (userIds.length === 0) return
  const { error } = await admin.from("subscriptions").delete().in("user_id", userIds)
  if (error) throw new Error(`wipe rows: ${error.message}`)
}

export function secretRowFor(userId, name, monthlyCost = 200) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    monthly_cost: monthlyCost,
    renew_date: "2026-10-01",
    category: "AI",
    cancel_url: "https://chatgpt.com/account/manage",
    last_used: null,
    decision: "undecided",
    remind_at: null,
    is_sample: false,
    cut_at: null,
  }
}

export async function proveApiIsolation({ clientA, clientB, userA, secretRow }) {
  const { error: insertError } = await clientA.from("subscriptions").insert(secretRow)
  if (insertError) throw new Error(`A insert: ${insertError.message}`)

  const { data: aReads, error: aReadError } = await clientA
    .from("subscriptions")
    .select("name, monthly_cost, user_id")
  if (aReadError) throw new Error(`A select: ${aReadError.message}`)
  if (!aReads?.some((row) => row.name === secretRow.name && Number(row.monthly_cost) === Number(secretRow.monthly_cost))) {
    throw new Error("User A cannot read the row they just wrote.")
  }

  const { data: bReads, error: bReadError } = await clientB.from("subscriptions").select("*")
  if (bReadError) throw new Error(`B select: ${bReadError.message}`)
  if ((bReads ?? []).length !== 0) {
    throw new Error(`User B saw ${bReads.length} row(s) — RLS is leaking.`)
  }

  const { data: bFilter, error: bFilterError } = await clientB
    .from("subscriptions")
    .select("*")
    .eq("user_id", userA.id)
  if (bFilterError) throw new Error(`B filtered select: ${bFilterError.message}`)
  if ((bFilter ?? []).length !== 0) {
    throw new Error("User B read A’s row by guessing user_id.")
  }

  const steal = {
    ...secretRow,
    id: crypto.randomUUID(),
    user_id: userA.id,
    name: "Stolen into A",
  }
  const { error: stealError } = await clientB.from("subscriptions").insert(steal)
  if (!stealError) throw new Error("User B inserted a row with A’s user_id — insert policy is broken.")
}

export async function signInPassword(url, anon, email, password) {
  const client = anonClient(url, anon)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`sign in ${email}: ${error?.message ?? "no session"}`)
  }
  return { client, session: data.session, user: data.user }
}

export async function prepareIsoPair(options = {}) {
  const { url, anon, service } = readRiteStackEnv()
  const { userAEmail, userBEmail } = isoEmails()
  const stamp = options.stamp ?? Date.now()
  const password = options.password ?? process.env.RITESTACK_ISO_PASSWORD ?? `Iso_${stamp}_Aa1!`
  const secretName = options.secretName ?? "OpenAI Pro+"

  const admin = adminClient(url, service)
  const userA = await ensureIsoUser(admin, userAEmail, password)
  const userB = await ensureIsoUser(admin, userBEmail, password)
  await wipeIsoRows(admin, [userA.id, userB.id])

  const signedA = await signInPassword(url, anon, userAEmail, password)
  const signedB = await signInPassword(url, anon, userBEmail, password)
  const secretRow = secretRowFor(userA.id, secretName)

  return {
    url,
    anon,
    service,
    admin,
    password,
    userAEmail,
    userBEmail,
    userA,
    userB,
    clientA: signedA.client,
    clientB: signedB.client,
    sessionA: signedA.session,
    sessionB: signedB.session,
    secretRow,
    secretName,
    storageKey: authStorageKey(url),
    projectRef: projectRefFromUrl(url),
    hostedOrigin: hostedOrigin(),
  }
}

export async function runIsolationTest() {
  const pair = await prepareIsoPair()
  try {
    await proveApiIsolation(pair)
  } catch (error) {
    await wipeIsoRows(pair.admin, [pair.userA.id, pair.userB.id]).catch(() => {})
    fail(error instanceof Error ? error.message : String(error))
  }
  await wipeIsoRows(pair.admin, [pair.userA.id, pair.userB.id])
  console.log("PASS: two-user isolation")
  console.log(`project_ref=${pair.projectRef}`)
  console.log("A saw own OpenAI Pro+ $200; B saw zero rows; B could not insert as A.")
  console.log("Reused @example.invalid test emails. Job Pursuit ref was not used.")
}

function isMainModule() {
  const entry = process.argv[1]
  if (!entry) return false
  return import.meta.url === pathToFileURL(resolve(entry)).href
}

if (isMainModule()) {
  await runIsolationTest()
}

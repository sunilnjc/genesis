#!/usr/bin/env node
/**
 * Two-user isolation proof for RiteStack Supabase.
 *
 * Requires .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (script only — never shipped to the browser)
 *
 * Refuses Job Pursuit’s project ref.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const JOB_PURSUIT_REF = "vhjwzxcgkmxvrmfstzpy"

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

if (!url || !anon || !service) {
  fail("Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local")
}
if (url.includes(JOB_PURSUIT_REF) || url.includes("the-job-pursuit")) {
  fail("Refusing Job Pursuit Supabase. Create a new ritestack project.")
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const stamp = Date.now()
const userAEmail = `ritestack-iso-a-${stamp}@example.invalid`
const userBEmail = `ritestack-iso-b-${stamp}@example.invalid`
const password = `Iso_${stamp}_Aa1!`

const { data: createdA, error: createAError } = await admin.auth.admin.createUser({
  email: userAEmail,
  password,
  email_confirm: true,
})
if (createAError || !createdA.user) fail(`create user A: ${createAError?.message}`)

const { data: createdB, error: createBError } = await admin.auth.admin.createUser({
  email: userBEmail,
  password,
  email_confirm: true,
})
if (createBError || !createdB.user) fail(`create user B: ${createBError?.message}`)

const userA = createdA.user
const userB = createdB.user

const clientA = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
const clientB = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })

const { error: signAError } = await clientA.auth.signInWithPassword({ email: userAEmail, password })
if (signAError) fail(`sign in A: ${signAError.message}`)
const { error: signBError } = await clientB.auth.signInWithPassword({ email: userBEmail, password })
if (signBError) fail(`sign in B: ${signBError.message}`)

const secretRow = {
  id: crypto.randomUUID(),
  user_id: userA.id,
  name: "OpenAI Pro+",
  monthly_cost: 200,
  renew_date: "2026-10-01",
  category: "AI",
  cancel_url: "https://chatgpt.com/account/manage",
  last_used: null,
  decision: "undecided",
  remind_at: null,
  is_sample: false,
  cut_at: null,
}

const { error: insertError } = await clientA.from("subscriptions").insert(secretRow)
if (insertError) fail(`A insert: ${insertError.message}`)

const { data: aReads, error: aReadError } = await clientA.from("subscriptions").select("name, monthly_cost, user_id")
if (aReadError) fail(`A select: ${aReadError.message}`)
if (!aReads?.some((row) => row.name === "OpenAI Pro+" && Number(row.monthly_cost) === 200)) {
  fail("User A cannot read the row they just wrote.")
}

const { data: bReads, error: bReadError } = await clientB.from("subscriptions").select("*")
if (bReadError) fail(`B select: ${bReadError.message}`)
if ((bReads ?? []).length !== 0) {
  fail(`User B saw ${bReads.length} row(s) — RLS is leaking.`)
}

const { data: bFilter, error: bFilterError } = await clientB
  .from("subscriptions")
  .select("*")
  .eq("user_id", userA.id)
if (bFilterError) fail(`B filtered select: ${bFilterError.message}`)
if ((bFilter ?? []).length !== 0) {
  fail("User B read A’s row by guessing user_id.")
}

const steal = {
  ...secretRow,
  id: crypto.randomUUID(),
  user_id: userA.id,
  name: "Stolen into A",
}
const { error: stealError } = await clientB.from("subscriptions").insert(steal)
if (!stealError) fail("User B inserted a row with A’s user_id — insert policy is broken.")

await admin.from("subscriptions").delete().in("user_id", [userA.id, userB.id])
await admin.auth.admin.deleteUser(userA.id)
await admin.auth.admin.deleteUser(userB.id)

const projectRef = new URL(url).hostname.split(".")[0]
console.log("PASS: two-user isolation")
console.log(`project_ref=${projectRef}`)
console.log("A saw own OpenAI Pro+ $200; B saw zero rows; B could not insert as A.")
console.log("Job Pursuit ref was not used.")

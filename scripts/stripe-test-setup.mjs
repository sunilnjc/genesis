#!/usr/bin/env node
/**
 * Creates a Stripe *test-mode* RiteStack $14 one-time product + webhook.
 * Reads STRIPE_SECRET_KEY from .env.local. Never prints secrets.
 *
 *   node --env-file=.env.local scripts/stripe-test-setup.mjs
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "..")
const ENV_PATH = resolve(ROOT, ".env.local")
const API = "https://api.stripe.com/v1"
const VERSION = "2024-06-20"
const WEBHOOK_URL = "https://ritestack.app/api/billing/webhook"

function readEnv(path) {
  const values = {}
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
      if (match) values[match[1]] = match[2]
    }
  } catch {
    throw new Error("Missing .env.local. Copy .env.example and add STRIPE_SECRET_KEY=sk_test_…")
  }
  return values
}

function writeEnv(path, key, value) {
  const lines = readFileSync(path, "utf8").split("\n")
  let found = false
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`
      found = true
    }
  }
  if (!found) {
    if (lines.at(-1) === "") lines[lines.length - 1] = `${key}=${value}`
    else lines.push(`${key}=${value}`)
    if (lines.at(-1) !== "") lines.push("")
  }
  writeFileSync(path, lines.join("\n"))
}

async function stripe(key, method, path, fields) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": VERSION,
      ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: fields ? new URLSearchParams(fields).toString() : undefined,
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.error?.message || `Stripe ${path} failed (${response.status})`)
  }
  return body
}

const env = readEnv(ENV_PATH)
const key = (env.STRIPE_SECRET_KEY || "").trim()
if (!key.startsWith("sk_test_")) {
  console.error("Refusing: STRIPE_SECRET_KEY must be a sk_test_ key in .env.local")
  process.exit(1)
}

let priceId = (env.STRIPE_PRICE_ID || "").trim()
if (priceId.startsWith("price_")) {
  console.log("Price already set; skipped create.")
} else {
  const product = await stripe(key, "POST", "/products", {
    name: "RiteStack pack",
    description: "One-time unlock for keep / cut / pause, cancel URLs, and pause reminders.",
    "metadata[sku]": "ritestack_pack",
  })
  const price = await stripe(key, "POST", "/prices", {
    product: product.id,
    currency: "usd",
    unit_amount: "1400",
  })
  priceId = price.id
  writeEnv(ENV_PATH, "STRIPE_PRICE_ID", priceId)
  console.log("Created test product", product.id, "price", priceId)
}

let webhookSecret = (env.STRIPE_WEBHOOK_SECRET || "").trim()
if (webhookSecret.startsWith("whsec_")) {
  console.log("Webhook secret already set; skipped create.")
} else {
  const existing = await stripe(key, "GET", "/webhook_endpoints?limit=100")
  if ((existing.data || []).some((item) => item.url === WEBHOOK_URL)) {
    console.log(
      "A webhook for",
      WEBHOOK_URL,
      "already exists. Paste its signing secret into STRIPE_WEBHOOK_SECRET."
    )
  } else {
    const endpoint = await stripe(key, "POST", "/webhook_endpoints", {
      url: WEBHOOK_URL,
      "enabled_events[0]": "checkout.session.completed",
      description: "RiteStack pack (test)",
    })
    writeEnv(ENV_PATH, "STRIPE_WEBHOOK_SECRET", endpoint.secret)
    console.log("Created webhook endpoint", endpoint.id, "for", WEBHOOK_URL)
  }
}

console.log("Done. Secrets stayed in .env.local (gitignored).")

import assert from "node:assert/strict"
import test from "node:test"
import { checkoutSignInError, CHECKOUT_SIGN_IN_ERROR } from "../src/lib/checkout-access.ts"
import { checkedPaddleCheckoutUrl, checkedProviderCheckoutUrl } from "../src/lib/checkout-url.ts"
import {
  handlePaddleWebhook,
  paidCheckoutFromPaddleEvent,
  PaddleConfigError,
  paddleConfigured,
  readPaddleConfig,
  verifyPaddleWebhook,
} from "../src/lib/paddle.ts"

const PADDLE_ENV = {
  PADDLE_API_KEY: "pdl_sdbx_fixture_not_a_real_key",
  PADDLE_WEBHOOK_SECRET: "pdl_ntfset_fixture_secret",
  PADDLE_PRICE_ID: "pri_testpack14",
  PADDLE_ENV: "sandbox",
  NEXT_PUBLIC_APP_URL: "https://ritestack.app",
}

const USER = "11111111-1111-4111-8111-111111111111"

function completedEvent(overrides: Record<string, unknown> = {}) {
  return {
    event_id: "evt_01fixture",
    event_type: "transaction.completed",
    occurred_at: "2026-09-19T12:00:00.000Z",
    data: {
      id: "txn_01hgrantpack00000000000000",
      status: "completed",
      customer_id: "ctm_01hbuyer000000000000000000",
      custom_data: { user_id: USER, sku: "ritestack_pack" },
      items: [{ price_id: "pri_testpack14", quantity: 1 }],
      ...overrides,
    },
  }
}

test("Paddle is configured only with all four secret names", () => {
  assert.equal(paddleConfigured({}), false)
  assert.equal(paddleConfigured({ ...PADDLE_ENV, PADDLE_ENV: "staging" }), false)
  assert.equal(paddleConfigured({ ...PADDLE_ENV, PADDLE_PRICE_ID: "price_stripe" }), false)
  const config = readPaddleConfig(PADDLE_ENV)
  assert.equal(config.env, "sandbox")
  assert.equal(config.apiBase, "https://sandbox-api.paddle.com")
  assert.equal(readPaddleConfig({ ...PADDLE_ENV, PADDLE_ENV: "live" }).apiBase, "https://api.paddle.com")
  assert.throws(() => readPaddleConfig({ ...PADDLE_ENV, PADDLE_API_KEY: "" }), PaddleConfigError)
})

test("unsigned hosted checkout is 400 Sign in to buy the RiteStack pack", () => {
  assert.equal(
    checkoutSignInError({ supabaseConfigured: true, hasUser: false }),
    CHECKOUT_SIGN_IN_ERROR
  )
  assert.equal(CHECKOUT_SIGN_IN_ERROR, "Sign in to buy the RiteStack pack.")
  assert.equal(checkoutSignInError({ supabaseConfigured: true, hasUser: true }), null)
  assert.equal(checkoutSignInError({ supabaseConfigured: false, hasUser: false }), null)
})

test("Paddle checkout URLs are overlay links or paddle.com hosts", () => {
  const overlay = "https://ritestack.app/unlock?_ptxn=txn_01hfixture000000000000000"
  assert.equal(checkedPaddleCheckoutUrl(overlay, "https://ritestack.app"), overlay)
  const hosted = "https://sandbox-buy.paddle.com/checkout?_ptxn=txn_01hfixture"
  assert.equal(checkedProviderCheckoutUrl(hosted, "paddle", "https://ritestack.app"), hosted)
  assert.throws(() => checkedPaddleCheckoutUrl("https://evil.example/?_ptxn=txn_01h", "https://ritestack.app"))
  assert.throws(() =>
    checkedPaddleCheckoutUrl("https://ritestack.app.evil.example/?_ptxn=txn_01h", "https://ritestack.app")
  )
})

test("unsigned paddle webhook is 400 and does not grant", async () => {
  const payload = JSON.stringify(completedEvent())
  const missing = await handlePaddleWebhook(payload, "", PADDLE_ENV)
  assert.equal(missing.status, 400)
  assert.equal(missing.body.error, "Invalid Paddle signature.")
  assert.equal(missing.paid, null)

  const timestamp = Math.floor(Date.now() / 1000)
  const forged = await handlePaddleWebhook(
    payload,
    `ts=${timestamp};h1=${"0".repeat(64)}`,
    PADDLE_ENV,
  )
  assert.equal(forged.status, 400)
  assert.equal(forged.paid, null)
})

test("signed transaction.completed webhook grants pack_paid_at fields", async () => {
  const payload = JSON.stringify(completedEvent())
  const timestamp = Math.floor(Date.now() / 1000)
  const signed = await hmac(PADDLE_ENV.PADDLE_WEBHOOK_SECRET, `${timestamp}:${payload}`)
  assert.equal(
    await verifyPaddleWebhook(payload, `ts=${timestamp};h1=${signed}`, PADDLE_ENV.PADDLE_WEBHOOK_SECRET),
    true
  )

  const result = await handlePaddleWebhook(payload, `ts=${timestamp};h1=${signed}`, PADDLE_ENV)
  assert.equal(result.status, 200)
  assert.equal(result.body.received, true)
  assert.equal(result.paid?.userId, USER)
  assert.equal(result.paid?.sessionId, "txn_01hgrantpack00000000000000")
  assert.equal(result.paid?.customerId, "ctm_01hbuyer000000000000000000")
  assert.equal(result.paid?.amountTotal, 1400)
})

test("only a completed ritestack_pack Paddle transaction counts", () => {
  const event = completedEvent()
  assert.equal(paidCheckoutFromPaddleEvent(event, "pri_testpack14")?.userId, USER)
  assert.equal(
    paidCheckoutFromPaddleEvent(completedEvent({ status: "billed" }), "pri_testpack14"),
    null
  )
  assert.equal(
    paidCheckoutFromPaddleEvent({ ...event, event_type: "transaction.updated" }, "pri_testpack14"),
    null
  )
  assert.equal(paidCheckoutFromPaddleEvent(event, "pri_other"), null)
  assert.equal(
    paidCheckoutFromPaddleEvent(
      completedEvent({ custom_data: { user_id: USER, sku: "other_sku" } }),
      "pri_testpack14"
    ),
    null
  )
})

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

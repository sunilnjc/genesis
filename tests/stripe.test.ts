import assert from "node:assert/strict"
import test from "node:test"
import { checkedCheckoutUrl } from "../src/lib/checkout-url.ts"
import {
  checkoutSessionFields,
  paidCheckoutFromSession,
  readStripeConfig,
  StripeConfigError,
  verifyStripeWebhook,
} from "../src/lib/stripe.ts"

test("checkout is a one-time $14 payment, not a subscription trial", () => {
  const fields = checkoutSessionFields({
    appUrl: "https://ritestack.app",
    priceId: null,
    userId: "11111111-1111-4111-8111-111111111111",
    email: "founder@example.com",
  })
  assert.equal(fields.mode, "payment")
  assert.equal(fields["line_items[0][price_data][unit_amount]"], "1400")
  assert.equal(fields["line_items[0][price_data][currency]"], "usd")
  assert.equal(fields["metadata[sku]"], "ritestack_pack")
  assert.ok(!Object.keys(fields).some((key) => key.includes("subscription") || key.includes("trial")))
  assert.equal(
    fields.success_url,
    "https://ritestack.app/?checkout=success&session_id={CHECKOUT_SESSION_ID}"
  )
})

test("unlock page can return to /unlock after $14 Checkout", () => {
  const fields = checkoutSessionFields({
    appUrl: "https://ritestack.app",
    priceId: null,
    userId: "11111111-1111-4111-8111-111111111111",
    returnTo: "/unlock",
  })
  assert.equal(
    fields.success_url,
    "https://ritestack.app/unlock?checkout=success&session_id={CHECKOUT_SESSION_ID}"
  )
  assert.equal(fields.cancel_url, "https://ritestack.app/unlock?checkout=cancel")
  assert.equal(fields.mode, "payment")
})

test("configured price id is used when present", () => {
  const fields = checkoutSessionFields({
    appUrl: "https://ritestack.app",
    priceId: "price_testpack",
    userId: "user_1",
  })
  assert.equal(fields["line_items[0][price]"], "price_testpack")
  assert.equal(fields["line_items[0][price_data][unit_amount]"], undefined)
})

test("customer email is copied onto the Stripe receipt", () => {
  const fields = checkoutSessionFields({
    appUrl: "https://ritestack.app",
    priceId: null,
    userId: "user_1",
    email: "buyer@example.invalid",
  })
  assert.equal(fields.customer_email, "buyer@example.invalid")
  assert.equal(fields["payment_intent_data[receipt_email]"], "buyer@example.invalid")
  assert.equal(fields.mode, "payment")
  assert.equal(fields["line_items[0][price_data][unit_amount]"], "1400")
})

test("test Stripe keys are still accepted", () => {
  const config = readStripeConfig({
    STRIPE_SECRET_KEY: "sk_test_fixture",
    NEXT_PUBLIC_APP_URL: "https://ritestack.app",
  })
  assert.equal(config.stripeMode, "test")
  assert.equal(config.liveMode, false)
})

test("live Stripe keys are accepted for Checkout", () => {
  const config = readStripeConfig({
    STRIPE_SECRET_KEY: "sk_live_fixture",
    NEXT_PUBLIC_APP_URL: "https://ritestack.app",
    STRIPE_PRICE_ID: "price_live_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_live_fixture",
  })
  assert.equal(config.stripeMode, "live")
  assert.equal(config.liveMode, true)
  assert.equal(config.priceId, "price_live_fixture")
})

test("non-Stripe secrets are still refused", () => {
  assert.throws(
    () =>
      readStripeConfig({
        STRIPE_SECRET_KEY: "not_a_stripe_key",
        NEXT_PUBLIC_APP_URL: "https://ritestack.app",
      }),
    StripeConfigError
  )
})

test("checkout URLs must be hosted on checkout.stripe.com", () => {
  const ok = "https://checkout.stripe.com/c/pay/cs_test_fixture"
  assert.equal(checkedCheckoutUrl(ok), ok)
  for (const url of [
    "http://checkout.stripe.com/c/pay/x",
    "https://checkout.stripe.com.evil.example/x",
    "https://evil.example/checkout.stripe.com",
    "https://checkout.stripe.com@evil.example/x",
  ]) {
    assert.throws(() => checkedCheckoutUrl(url))
  }
})

test("webhook signatures are checked with the raw body", async () => {
  const secret = "whsec_test_secret"
  const payload = JSON.stringify({ type: "checkout.session.completed" })
  const timestamp = 1_000_000
  const signed = await hmac(secret, `${timestamp}.${payload}`)
  assert.equal(
    await verifyStripeWebhook(payload, `t=${timestamp},v1=${signed}`, secret, timestamp * 1000),
    true
  )
  assert.equal(
    await verifyStripeWebhook(payload, `t=${timestamp},v1=${"0".repeat(64)}`, secret, timestamp * 1000),
    false
  )
})

test("only a paid $14 ritestack_pack session counts", () => {
  const base = {
    object: "checkout.session",
    id: "cs_test_paid",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: 1400,
    client_reference_id: "user_1",
    metadata: { user_id: "user_1", sku: "ritestack_pack" },
    customer: "cus_test",
  }
  assert.equal(paidCheckoutFromSession(base)?.userId, "user_1")
  assert.equal(paidCheckoutFromSession({ ...base, payment_status: "unpaid" }), null)
  assert.equal(paidCheckoutFromSession({ ...base, amount_total: 600 }), null)
  assert.equal(paidCheckoutFromSession({ ...base, mode: "subscription" }), null)
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

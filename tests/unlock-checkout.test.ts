import assert from "node:assert/strict"
import test from "node:test"
import {
  checkoutReturnPath,
  checkoutReturnPathFromRequest,
  checkoutReturnUrls,
} from "../src/lib/checkout-return.ts"
import { canStartPackCheckout } from "../src/lib/entitlement.ts"

test("only / and /unlock are valid Checkout return paths", () => {
  assert.equal(checkoutReturnPath("/unlock"), "/unlock")
  assert.equal(checkoutReturnPath("/"), "/")
  assert.equal(checkoutReturnPath("https://evil.example"), "/")
  assert.equal(checkoutReturnPath("/inventory"), "/")
  assert.equal(checkoutReturnPath(undefined), "/")
})

test("unlock return URLs stay on ritestack.app", () => {
  const urls = checkoutReturnUrls("https://ritestack.app", "/unlock")
  assert.equal(
    urls.success_url,
    "https://ritestack.app/unlock?checkout=success&session_id={CHECKOUT_SESSION_ID}"
  )
  assert.equal(urls.cancel_url, "https://ritestack.app/unlock?checkout=cancel")
})

test("checkout POST body returnTo=/unlock is accepted; other values fall back", async () => {
  const unlock = new Request("https://ritestack.app/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnTo: "/unlock" }),
  })
  assert.equal(await checkoutReturnPathFromRequest(unlock), "/unlock")

  const empty = new Request("https://ritestack.app/api/billing/checkout", { method: "POST" })
  assert.equal(await checkoutReturnPathFromRequest(empty), "/")

  const sneaky = new Request("https://ritestack.app/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnTo: "https://evil.example" }),
  })
  assert.equal(await checkoutReturnPathFromRequest(sneaky), "/")
})

test("trial users can start $14 Checkout; paid users cannot", () => {
  assert.equal(canStartPackCheckout({ state: "trial", checkoutEnabled: true }), true)
  assert.equal(canStartPackCheckout({ state: "paywall", checkoutEnabled: true }), true)
  assert.equal(canStartPackCheckout({ state: "local", checkoutEnabled: true }), true)
  assert.equal(canStartPackCheckout({ state: "paid", checkoutEnabled: false }), false)
  assert.equal(canStartPackCheckout({ state: "trial", checkoutEnabled: false }), false)
})

import assert from "node:assert/strict"
import test from "node:test"
import { subscriptionListMode } from "../src/lib/auth/config.ts"

test("hosted + configured + unsigned requires login and no list", () => {
  assert.equal(
    subscriptionListMode({ configured: true, isLocalhost: false, signedIn: false }),
    "login-required"
  )
})

test("hosted + configured + signed-in uses the remote list", () => {
  assert.equal(
    subscriptionListMode({ configured: true, isLocalhost: false, signedIn: true }),
    "remote"
  )
})

test("any configured build stays empty until sign-in, including localhost", () => {
  assert.equal(
    subscriptionListMode({ configured: true, isLocalhost: true, signedIn: false }),
    "empty"
  )
})

test("localhost without Supabase may keep the founder localStorage notebook", () => {
  assert.equal(
    subscriptionListMode({ configured: false, isLocalhost: true, signedIn: false }),
    "local-founder"
  )
})

test("hosted without Supabase still must not paint the founder notebook", () => {
  assert.equal(
    subscriptionListMode({ configured: false, isLocalhost: false, signedIn: false }),
    "login-required"
  )
})

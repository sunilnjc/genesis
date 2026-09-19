import assert from "node:assert/strict"
import test from "node:test"
import { playwrightAuthCookies } from "../src/lib/auth/session-cookie.ts"
import {
  accessTokenFromCookieHeader,
  bearerFromAuthorization,
  billingAuthHeaders,
  jwtFromRequest,
} from "../src/lib/billing-auth.ts"

const STORAGE_KEY = "sb-gmbretmepjxrsmuxvpbn-auth-token"
const ACCESS = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig"

function cookieHeaderFromSession(session: unknown, storageKey = STORAGE_KEY): string {
  return playwrightAuthCookies("https://ritestack.app", storageKey, session)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")
}

test("billing fetches send Bearer the way /api/billing/status expects", () => {
  assert.deepEqual(billingAuthHeaders(null), {})
  assert.deepEqual(billingAuthHeaders(undefined), {})
  assert.deepEqual(billingAuthHeaders(""), {})
  assert.deepEqual(billingAuthHeaders(ACCESS), { Authorization: `Bearer ${ACCESS}` })
})

test("Bearer header is stripped of the scheme", () => {
  assert.equal(bearerFromAuthorization(`Bearer ${ACCESS}`), ACCESS)
  assert.equal(bearerFromAuthorization(`bearer ${ACCESS}`), ACCESS)
  assert.equal(bearerFromAuthorization(null), "")
  assert.equal(bearerFromAuthorization("Basic abc"), "")
})

test("cookie session from /auth/callback yields the access token", () => {
  const header = cookieHeaderFromSession({
    access_token: ACCESS,
    user: { id: "11111111-1111-4111-8111-111111111111" },
  })
  assert.equal(accessTokenFromCookieHeader(header), ACCESS)
})

test("chunked supabase cookies are joined before decode", () => {
  const bulky = {
    access_token: ACCESS,
    refresh_token: "r".repeat(4000),
    user: { id: "11111111-1111-4111-8111-111111111111", email: "qa@example.invalid" },
  }
  const cookies = playwrightAuthCookies("https://ritestack.app", STORAGE_KEY, bulky)
  assert.ok(cookies.some((cookie) => cookie.name.endsWith(".0")), "expected chunked auth cookies")
  const header = [
    ...cookies.map((cookie) => `${cookie.name}=${cookie.value}`),
    `${STORAGE_KEY}-code-verifier=not-a-session`,
  ].join("; ")
  assert.equal(accessTokenFromCookieHeader(header), ACCESS)
})

test("jwtFromRequest prefers Authorization over cookies", () => {
  const cookie = cookieHeaderFromSession({ access_token: "cookie-jwt" })
  const request = new Request("https://ritestack.app/api/billing/status", {
    headers: {
      authorization: "Bearer header-jwt",
      cookie,
    },
  })
  assert.equal(jwtFromRequest(request), "header-jwt")
})

test("jwtFromRequest falls back to the hosted cookie session", () => {
  const cookie = cookieHeaderFromSession({ access_token: ACCESS })
  const request = new Request("https://ritestack.app/api/billing/checkout", {
    headers: { cookie },
  })
  assert.equal(jwtFromRequest(request), ACCESS)
})

test("unsigned traffic still has no jwt", () => {
  const request = new Request("https://ritestack.app/api/billing/status")
  assert.equal(jwtFromRequest(request), "")
})

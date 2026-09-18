import assert from "node:assert/strict"
import test from "node:test"
import {
  authErrorPath,
  classifyAuthFailure,
  friendlyAuthError,
  parseAuthCallbackSearch,
  safeNextPath,
} from "../src/lib/auth/callback.ts"
import { playwrightAuthCookies } from "../src/lib/auth/session-cookie.ts"

test("token_hash on the app domain is the mail-app path", () => {
  const parsed = parseAuthCallbackSearch("?token_hash=deadbeef&type=magiclink")
  assert.equal(parsed.kind, "token_hash")
  assert.equal(parsed.tokenHash, "deadbeef")
  assert.equal(parsed.type, "magiclink")
  assert.equal(parsed.code, null)
})

test("token query alias still verifies as token_hash", () => {
  const parsed = parseAuthCallbackSearch("token=hashed&type=signup")
  assert.equal(parsed.kind, "token_hash")
  assert.equal(parsed.tokenHash, "hashed")
  assert.equal(parsed.type, "signup")
})

test("PKCE code remains a same-browser fallback", () => {
  const parsed = parseAuthCallbackSearch("?code=abc&next=/inventory")
  assert.equal(parsed.kind, "pkce_code")
  assert.equal(parsed.code, "abc")
})

test("provider PKCE error is classified, never shown raw", () => {
  const parsed = parseAuthCallbackSearch(
    "?error=invalid_request&error_code=validation_failed&error_description=PKCE+code+verifier+not+found+in+storage.+This+can+happen+if+the+auth+flow+was+initiated+in+a+different+browser"
  )
  assert.equal(parsed.kind, "provider_error")
  assert.equal(classifyAuthFailure(parsed.error), "pkce")
  const message = friendlyAuthError(parsed.error)
  assert.equal(/pkce|code verifier/i.test(message), false)
  assert.match(message, /mail app/i)
  assert.equal(authErrorPath("pkce"), "/auth/error?reason=pkce")
  assert.equal(/pkce|code verifier/i.test(friendlyAuthError("pkce")), false)
})

test("safe next paths stay on-origin", () => {
  assert.equal(safeNextPath("/inventory"), "/inventory")
  assert.equal(safeNextPath("https://evil.example"), "/")
  assert.equal(safeNextPath("//ritestack.app"), "/")
  assert.equal(safeNextPath(null), "/")
})

test("playwright cookies match @supabase/ssr chunk names", () => {
  const cookies = playwrightAuthCookies("https://ritestack.app", "sb-gmbretmepjxrsmuxvpbn-auth-token", {
    access_token: "a".repeat(20),
    refresh_token: "b".repeat(20),
  })
  assert.ok(cookies.length >= 1)
  assert.equal(cookies[0].name.startsWith("sb-gmbretmepjxrsmuxvpbn-auth-token"), true)
  assert.equal(cookies[0].httpOnly, false)
  assert.equal(cookies[0].secure, true)
  assert.equal(cookies[0].sameSite, "Lax")
  assert.equal(cookies[0].path, "/")
  assert.equal(cookies[0].value.includes("PKCE"), false)
})

import assert from "node:assert/strict"
import test from "node:test"
import { requestEmailCode, verifyEmailCode, validEmailCode } from "../src/lib/auth/email-otp.ts"

test("numeric OTP supports configured lengths and pasted spacing without truncating", () => {
  assert.equal(validEmailCode("123456"), true)
  assert.equal(validEmailCode("1234 5678"), true)
  assert.equal(validEmailCode("0123456789"), true)
  for (const code of ["", "12345", "12345678901", "123456x", "1.23456", "123-456"]) {
    assert.equal(validEmailCode(code), false)
  }
})

test("request sends normalized address and no magic-link redirect", async () => {
  const calls: unknown[] = []
  const auth = {
    async signInWithOtp(input: unknown) { calls.push(input); return { error: null } },
    async verifyOtp() { throw new Error("must not verify on request") },
  }
  assert.deepEqual(await requestEmailCode(auth, " qa@example.com "), { error: null })
  assert.deepEqual(calls, [{ email: "qa@example.com", options: { shouldCreateUser: true } }])
  assert.ok((await requestEmailCode(auth, "invalid")).error)
  assert.equal(calls.length, 1)
})

test("verification uses email OTP and preserves a leading zero", async () => {
  let captured: unknown
  const auth = {
    async signInWithOtp() { return { error: null } },
    async verifyOtp(input: unknown) { captured = input; return { error: null } },
  }
  assert.deepEqual(await verifyEmailCode(auth, " qa@example.com ", "0123 4567"), { error: null })
  assert.deepEqual(captured, { email: "qa@example.com", token: "01234567", type: "email" })
})

test("invalid input never reaches the verification API", async () => {
  const auth = {
    async signInWithOtp() { return { error: null } },
    async verifyOtp() { throw new Error("must not call API") },
  }
  assert.match((await verifyEmailCode(auth, "qa@example.com", "12345")).error!, /complete numeric code/)
})

test("expired, used and incorrect codes offer a recoverable error without raw details", async () => {
  const auth = {
    async signInWithOtp() { return { error: null } },
    async verifyOtp() { return { error: { code: "otp_expired", status: 403 } } },
  }
  assert.match((await verifyEmailCode(auth, "qa@example.com", "12345678")).error!, /newest code or request a new one/)
})

test("throttled requests and transport errors resolve as errors for the form", async () => {
  const auth = {
    async signInWithOtp() { return { error: { status: 429 } } },
    async verifyOtp(): Promise<never> { throw new Error("private transport details") },
  }
  assert.match((await requestEmailCode(auth, "qa@example.com")).error!, /wait a minute/)
  assert.match((await verifyEmailCode(auth, "qa@example.com", "12345678")).error!, /Check your connection/)
  assert.ok((await requestEmailCode(null, "qa@example.com")).error)
  assert.ok((await verifyEmailCode(null, "qa@example.com", "12345678")).error)
})

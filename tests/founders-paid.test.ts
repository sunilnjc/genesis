import assert from "node:assert/strict"
import test from "node:test"
import { foundersPaidNotify, readFoundersPaidEmail } from "../src/lib/founders-paid.ts"

const paid = {
  sessionId: "cs_test_paid_fixture",
  userId: "11111111-1111-4111-8111-111111111111",
  customerId: "cus_test",
  email: "buyer@example.invalid",
  amountTotal: 1400,
}

test("FOUNDERS_PAID_EMAIL is unset until the founder sets an inbox", () => {
  assert.equal(readFoundersPaidEmail({}), null)
  assert.equal(readFoundersPaidEmail({ FOUNDERS_PAID_EMAIL: "" }), null)
  assert.equal(readFoundersPaidEmail({ FOUNDERS_PAID_EMAIL: "   " }), null)
  assert.equal(readFoundersPaidEmail({ FOUNDERS_PAID_EMAIL: "not-an-email" }), null)
  assert.equal(readFoundersPaidEmail({ FOUNDERS_PAID_EMAIL: "hello@" }), null)
})

test("FOUNDERS_PAID_EMAIL is used as-is when it looks like an inbox", () => {
  assert.equal(
    readFoundersPaidEmail({ FOUNDERS_PAID_EMAIL: " founder@studio.example " }),
    "founder@studio.example"
  )
})

test("founder paid mail is $14 once and names live vs test", () => {
  const live = foundersPaidNotify({ paid, stripeMode: "live" })
  assert.equal(live.subject, "RiteStack pack paid · $14 live")
  assert.match(live.text, /Mode: live/)
  assert.match(live.text, /Amount: \$14 once/)
  assert.match(live.text, /Customer: buyer@example\.invalid/)
  assert.match(live.text, /cs_test_paid_fixture/)
  assert.match(live.text, /7 days full ritual\. Then \$14 once\./)
  assert.doesNotMatch(live.text, /subscription/i)

  const testMode = foundersPaidNotify({
    paid: { ...paid, email: null },
    stripeMode: "test",
  })
  assert.equal(testMode.subject, "RiteStack pack paid · $14 test")
  assert.match(testMode.text, /no customer email/i)
})

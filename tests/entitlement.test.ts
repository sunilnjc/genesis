import assert from "node:assert/strict"
import test from "node:test"
import { addTrialDays, entitlement, PACK_AMOUNT_CENTS, TRIAL_DAYS } from "../src/lib/entitlement.ts"

test("viewing the list is always free", () => {
  for (const input of [
    { hasSession: false, trialEndsAt: null, packPaidAt: null },
    { hasSession: true, trialEndsAt: "2000-01-01T00:00:00.000Z", packPaidAt: null },
    { hasSession: true, trialEndsAt: "2099-01-01T00:00:00.000Z", packPaidAt: null },
    { hasSession: true, trialEndsAt: "2000-01-01T00:00:00.000Z", packPaidAt: "2026-01-01T00:00:00.000Z" },
  ]) {
    assert.equal(entitlement(input).viewList, true)
  }
})

test("unsigned local use stays unlocked so localhost is not paywalled", () => {
  const row = entitlement({ hasSession: false, trialEndsAt: null, packPaidAt: null })
  assert.equal(row.state, "local")
  assert.equal(row.ritual, true)
})

test("signed-in users get a 7-day ritual trial", () => {
  const now = new Date("2026-09-18T12:00:00.000Z")
  const trialEndsAt = addTrialDays(now, TRIAL_DAYS).toISOString()
  const row = entitlement({
    now,
    hasSession: true,
    trialEndsAt,
    packPaidAt: null,
  })
  assert.equal(row.state, "trial")
  assert.equal(row.ritual, true)
  assert.equal(row.daysLeft, 7)
})

test("day 8 paywalls ritual until the $14 pack is paid", () => {
  const row = entitlement({
    now: new Date("2026-09-26T00:00:00.000Z"),
    hasSession: true,
    trialEndsAt: "2026-09-25T12:00:00.000Z",
    packPaidAt: null,
  })
  assert.equal(row.state, "paywall")
  assert.equal(row.ritual, false)
  assert.equal(row.daysLeft, 0)
})

test("paid pack unlocks ritual even after trial", () => {
  const row = entitlement({
    now: new Date("2026-12-01T00:00:00.000Z"),
    hasSession: true,
    trialEndsAt: "2026-09-25T12:00:00.000Z",
    packPaidAt: "2026-09-26T00:00:00.000Z",
  })
  assert.equal(row.state, "paid")
  assert.equal(row.ritual, true)
})

test("pack is fourteen dollars once, not a subscription", () => {
  assert.equal(PACK_AMOUNT_CENTS, 1400)
  assert.equal(TRIAL_DAYS, 7)
})

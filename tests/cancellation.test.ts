import assert from "node:assert/strict"
import test from "node:test"
import { cancellationPending, confirmCancellation, cancellationCalendar } from "../src/lib/cancellation.ts"
import { cutThisPass, monthlyBurn, queueReasons, renewalWall, decideByQueue } from "../src/lib/ritual.ts"
import type { Subscription } from "../src/lib/types.ts"
const today = "2026-10-06"
const row: Subscription = { id: "test", name: "Test tool", monthlyCost: 20, renewDate: "2026-10-10", category: "AI", cancelUrl: "", lastUsed: null, decision: "cut", remindAt: null, isSample: false, cutAt: today, createdAt: today, updatedAt: today }

test("legacy and new cuts remain pending, in burn, and out of savings", () => {
  assert.equal(cancellationPending(row), true)
  assert.equal(monthlyBurn([row]), 20)
  assert.equal(cutThisPass([row]), 0)
  assert.deepEqual(queueReasons(row, today), ["cancellation-pending", "renewing-soon"])
  assert.deepEqual(renewalWall([row], today), [row])
})
test("confirmation changes burn/savings and removes both reminder queues; reopening reverses it", () => {
  const confirmed = confirmCancellation(row, today, " Ref ABC ", today)
  assert.equal(confirmed.cancellationNote, "Ref ABC")
  assert.equal(confirmed.cutAt, row.cutAt)
  assert.equal(cancellationPending(confirmed), false)
  assert.equal(monthlyBurn([confirmed]), 0)
  assert.equal(cutThisPass([confirmed]), 20)
  assert.deepEqual(renewalWall([confirmed], today), [])
  assert.deepEqual(decideByQueue([confirmed], today), [])
  const reopened = { ...confirmed, cancellationConfirmedAt: null }
  assert.equal(cutThisPass([reopened]), 0)
  assert.equal(monthlyBurn([reopened]), 20)
})
test("overdue pending cancellations never disappear under the default 14-day filter", () => {
  const overdue = { ...row, renewDate: "2026-10-01" }
  const later = { ...row, renewDate: "2026-11-01" }
  assert.deepEqual(renewalWall([later, row, overdue], today), [overdue, row])
  assert.deepEqual(decideByQueue([later], today), [later])
  assert.deepEqual(queueReasons(overdue, today), ["cancellation-pending", "renew-passed"])
})
test("confirmation rejects non-cut, invalid/future dates and oversized notes", () => {
  for (const date of ["", "2026-02-30", "2026-10-07"]) assert.throws(() => confirmCancellation(row, date, "", today))
  assert.throws(() => confirmCancellation({ ...row, decision: "keep" }, today, "", today))
  assert.throws(() => confirmCancellation(row, today, "x".repeat(501), today))
  assert.equal(confirmCancellation(row, "2026-10-01", "", today).cancellationConfirmedAt, "2026-10-01")
})
test("calendar has a pre-renewal local notification, stable UID and escaped/folded text", () => {
  const text = cancellationCalendar({ ...row, name: "Tool;☀,".repeat(30) + "\nEND:VEVENT" }, today, new Date("2026-10-06T00:00:00Z"))
  assert.match(text, /DTSTART:20261007T090000/)
  assert.match(text, /UID:test-2026-10-10@ritestack.app/)
  assert.match(text, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0S/)
  assert.equal(text.match(/\r\nEND:VEVENT\r\n/g)?.length, 1)
  for (const line of text.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75)
  assert.throws(() => cancellationCalendar({ ...row, cancellationConfirmedAt: today }, today))
})
test("overdue calendar reminder starts in the future rather than at a passed 9am", () => {
  const now = new Date(2026, 9, 6, 23, 55)
  assert.match(cancellationCalendar({ ...row, renewDate: today }, today, now), /DTSTART:20261007T001000/)
})

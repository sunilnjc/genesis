import assert from "node:assert/strict"
import test from "node:test"
import { cutReceipts, receiptCancelUrl } from "../src/lib/cuts.ts"
import { monthlyBurn } from "../src/lib/ritual.ts"
import type { Subscription } from "../src/lib/types.ts"
import { viewFromPathname, pathForView } from "../src/lib/views.ts"

const row: Subscription = {
  id: "a", name: "Test tool", monthlyCost: 14, renewDate: "2026-10-01",
  category: "AI", cancelUrl: "https://example.com/cancel", lastUsed: null,
  decision: "cut", remindAt: null, isSample: false, cutAt: "2026-09-21",
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-21T12:00:00Z",
}

test("Cuts has its own route", () => {
  assert.equal(viewFromPathname("/cuts"), "cuts")
  assert.equal(viewFromPathname("/cuts/"), "cuts")
  assert.equal(pathForView("cuts"), "/cuts")
})
test("empty cuts and one cut keep the original receipt data", () => {
  assert.deepEqual(cutReceipts([]), [])
  assert.deepEqual(cutReceipts([row]), [row])
})
test("only cuts appear, newest cut first, regardless of later edits", () => {
  const older = { ...row, id: "older", cutAt: "2026-09-20", updatedAt: "2026-09-25T00:00:00Z" }
  const missing = { ...row, id: "missing", cutAt: null }
  const rows = [older, missing, row, ...(["keep", "pause", "undecided"] as const).map(decision => ({ ...row, id: decision, decision }))]
  const original = [...rows]
  assert.deepEqual(cutReceipts(rows).map(r => r.id), ["a", "older", "missing"])
  assert.deepEqual(rows, original)
  assert.equal(monthlyBurn(rows), 42)
})
test("receipt links accept only web URLs", () => {
  assert.equal(receiptCancelUrl(row.cancelUrl), row.cancelUrl)
  for (const url of ["", "javascript:alert(1)", "data:text/html,hello", "/cancel", "not a url"]) {
    assert.equal(receiptCancelUrl(url), null)
  }
})

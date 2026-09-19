import assert from "node:assert/strict"
import test from "node:test"
import { decideByQueue, unpauseSubscription } from "../src/lib/ritual.ts"
import type { Subscription } from "../src/lib/types.ts"

function row(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "p1",
    name: "Cursor Pro",
    monthlyCost: 20,
    renewDate: "2026-12-01",
    category: "AI",
    cancelUrl: "https://cursor.com/dashboard",
    lastUsed: null,
    decision: "pause",
    remindAt: "2026-10-19",
    isSample: false,
    cutAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  }
}

test("paused tools stay off Decide until the remind date", () => {
  const paused = row({ remindAt: "2026-10-19" })
  assert.equal(decideByQueue([paused], "2026-09-19").length, 0)
})

test("unpause returns the row to Decide as undecided", () => {
  const paused = row({ lastUsed: null, remindAt: "2026-10-19" })
  const next = unpauseSubscription(paused, "2026-09-19T10:00:00.000Z")

  assert.equal(next.decision, "undecided")
  assert.equal(next.remindAt, null)
  assert.equal(next.lastUsed, null)
  assert.equal(next.name, paused.name)
  assert.equal(next.monthlyCost, paused.monthlyCost)
  assert.deepEqual(decideByQueue([next], "2026-09-19").map((item) => item.id), ["p1"])
})

test("unpause keeps an existing last-used date and does not invent one", () => {
  const paused = row({ lastUsed: "2026-08-01" })
  const next = unpauseSubscription(paused, "2026-09-19T10:00:00.000Z")
  assert.equal(next.lastUsed, "2026-08-01")
  assert.equal(next.decision, "undecided")
})

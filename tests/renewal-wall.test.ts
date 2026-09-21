import assert from "node:assert/strict"
import test from "node:test"
import { addDays } from "../src/lib/dates.ts"
import { renewalWall, decideByQueue } from "../src/lib/ritual.ts"
import type { Subscription } from "../src/lib/types.ts"
const today = "2026-09-21"
function row(id: string, days: number, extra: Partial<Subscription> = {}): Subscription {
  return { id, name: id, monthlyCost: 20, renewDate: addDays(today, days), category: "AI", cancelUrl: "",
    lastUsed: null, decision: "undecided", remindAt: null, isSample: false, cutAt: null,
    createdAt: today, updatedAt: today, ...extra }
}
test("14-day window includes today and day 14; excludes overdue, day 15, and cuts", () => {
  const rows = [row("day15",15), row("day14",14), row("today",0), row("overdue",-1), row("cut",3,{ decision: "cut" }), row("keep",3,{ decision: "keep" })]
  const before = [...rows]
  assert.deepEqual(renewalWall(rows,today).map(r=>r.id), ["today","keep","day14"])
  assert.deepEqual(rows,before)
})
test("pause appears for either existing renewal or reminder in the window", () => {
  const rows = [
    row("renew",3,{ decision:"pause", remindAt:addDays(today,30) }),
    row("remind",20,{ decision:"pause", remindAt:addDays(today,2) }),
    row("remind14",20,{ decision:"pause", remindAt:addDays(today,14) }),
    row("later",20,{ decision:"pause", remindAt:addDays(today,15) }),
    row("past",20,{ decision:"pause", remindAt:addDays(today,-1) }),
    row("cut",1,{ decision:"cut", remindAt:today }),
  ]
  assert.deepEqual(renewalWall(rows,today).map(r=>r.id), ["remind","renew","remind14"])
})
test("turning off the wall preserves the original all-Decide queue", () => {
  const rows = [row("later",20), row("paused",3,{decision:"pause",remindAt:addDays(today,30)})]
  assert.deepEqual(decideByQueue(rows,today).map(r=>r.id),["later"])
  assert.deepEqual(renewalWall(rows,today).map(r=>r.id),["paused"])
})
test("empty windows and date-only boundaries across years, leap years, and DST", () => {
  assert.deepEqual(renewalWall([],today),[])
  for (const start of ["2026-12-25","2028-02-20","2026-03-01","2026-10-25"]) {
    assert.deepEqual(renewalWall([
      row("edge",0,{renewDate:addDays(start,14)}),
      row("outside",0,{renewDate:addDays(start,15)}),
    ],start).map(r=>r.id),["edge"])
  }
})

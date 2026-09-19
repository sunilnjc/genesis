import assert from "node:assert/strict"
import test from "node:test"
import { remainingTrialLabel, TRIAL_PACK_COPY } from "../src/lib/trial-copy.ts"

test("locked pack copy is the short ritual line, not a subscription story", () => {
  assert.equal(
    TRIAL_PACK_COPY,
    "7 days full ritual after sign-in. Then $14 once. Looking at your stack stays free."
  )
  assert.match(TRIAL_PACK_COPY, /7 days full ritual after sign-in/i)
  assert.match(TRIAL_PACK_COPY, /\$14 once/)
  assert.match(TRIAL_PACK_COPY, /Looking at your stack stays free/)
  assert.doesNotMatch(TRIAL_PACK_COPY, /subscription/i)
  assert.doesNotMatch(TRIAL_PACK_COPY, /You don’t miss the cancel button/)
  assert.doesNotMatch(TRIAL_PACK_COPY, /The problem/)
  assert.doesNotMatch(TRIAL_PACK_COPY, /pro plan/i)
})

test("remaining days come from trial_ends_at daysLeft", () => {
  assert.equal(remainingTrialLabel(7), "7 days left")
  assert.equal(remainingTrialLabel(1), "1 day left")
  assert.equal(remainingTrialLabel(0), null)
  assert.equal(remainingTrialLabel(null), null)
  assert.equal(remainingTrialLabel(undefined), null)
})

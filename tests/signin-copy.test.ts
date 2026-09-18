import assert from "node:assert/strict"
import test from "node:test"
import {
  SIGNIN_ACCESS,
  SIGNIN_FORBIDDEN_SEED,
  SIGNIN_HEADLINE,
  SIGNIN_LEDE,
  SIGNIN_PROBLEM,
  SIGNIN_RITUAL,
  SIGNIN_SPLIT,
  SIGNIN_WALKAWAY,
  allSigninCopy,
} from "../src/lib/signin-copy.ts"

test("unsigned story covers problem, ritual, walk-away, split, price, isolation", () => {
  const blob = allSigninCopy()
  assert.match(blob, /keep, cut, or pause/i)
  assert.match(blob, /cancel URL/i)
  assert.match(blob, /monthly burn/i)
  assert.match(blob, /Decide/)
  assert.match(blob, /Inventory/)
  assert.match(blob, /\$14/)
  assert.match(blob, /seven days/i)
  assert.match(blob, /own (tools|rows)/i)
  assert.match(blob, /magic link/i)
  assert.match(blob, /subscriptiongraveyard\.com/)
  assert.doesNotMatch(blob, /Plaid/)
  assert.doesNotMatch(blob, /LinkedIn/)
  assert.ok(SIGNIN_HEADLINE.length > 40)
  assert.ok(SIGNIN_LEDE.length > 180)
  assert.ok(SIGNIN_PROBLEM.length > 180)
  assert.ok(SIGNIN_RITUAL.length > 180)
  assert.ok(SIGNIN_WALKAWAY.length > 120)
  assert.ok(SIGNIN_SPLIT.length > 80)
  assert.ok(SIGNIN_ACCESS.length > 120)
})

test("unsigned copy never includes the founder seed notebook", () => {
  const blob = allSigninCopy()
  for (const seed of SIGNIN_FORBIDDEN_SEED) {
    assert.equal(blob.includes(seed), false, `unsigned copy leaked ${seed}`)
  }
})

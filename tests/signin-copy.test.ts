import assert from "node:assert/strict"
import test from "node:test"
import {
  SIGNIN_CONTEXT,
  SIGNIN_FORBIDDEN_SEED,
  SIGNIN_FORBIDDEN_STORY,
  SIGNIN_HEADLINE,
  allSigninCopy,
} from "../src/lib/signin-copy.ts"

test("unsigned login stays a short keep / cut / pause note", () => {
  const blob = allSigninCopy()
  assert.equal(SIGNIN_HEADLINE, "Sign in to your stack")
  assert.match(blob, /keep, cut, or pause/i)
  assert.match(blob, /magic link/i)
  assert.match(blob, /own list/i)
  assert.ok(SIGNIN_CONTEXT.length < 180)
  assert.ok(blob.split("\n").length <= 4)
  assert.doesNotMatch(blob, /Plaid/)
  assert.doesNotMatch(blob, /LinkedIn/)
  assert.doesNotMatch(blob, /Gmail/)
  for (const story of SIGNIN_FORBIDDEN_STORY) {
    assert.equal(blob.includes(story), false, `login copy still has long story: ${story}`)
  }
})

test("unsigned copy never includes the founder seed notebook", () => {
  const blob = allSigninCopy()
  for (const seed of SIGNIN_FORBIDDEN_SEED) {
    assert.equal(blob.includes(seed), false, `unsigned copy leaked ${seed}`)
  }
})

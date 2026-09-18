import assert from "node:assert/strict"
import test from "node:test"
import {
  SIGNIN_CONTEXT,
  SIGNIN_FORBIDDEN_SEED,
  SIGNIN_FORBIDDEN_STORY,
  SIGNIN_HEADLINE,
  STREAM_WORDS,
  STREAMER_INITIAL,
  allSigninCopy,
  jumpToNextWord,
  nextStreamerState,
  streamerDelayMs,
  streamerVisible,
} from "../src/lib/signin-copy.ts"

test("unsigned login keeps one short line around a keep/cut/pause streamer", () => {
  const blob = allSigninCopy()
  assert.equal(SIGNIN_HEADLINE, "Sign in to your stack")
  assert.deepEqual([...STREAM_WORDS], ["keep", "cut", "pause"])
  assert.ok(SIGNIN_CONTEXT.length < 80)
  assert.match(SIGNIN_CONTEXT, /AI and dev tools/i)
  assert.doesNotMatch(blob, /keep \/ cut \/ pause/)
  assert.ok(blob.split("\n").length <= 6)
  assert.doesNotMatch(blob, /Plaid/)
  assert.doesNotMatch(blob, /LinkedIn/)
  assert.doesNotMatch(blob, /Gmail/)
  for (const story of SIGNIN_FORBIDDEN_STORY) {
    assert.equal(blob.includes(story), false, `login copy still has long story: ${story}`)
  }
})

test("streamer types keep, cut, pause, then loops back to keep", () => {
  let state = STREAMER_INITIAL
  assert.equal(streamerVisible(state), "")

  for (const expected of ["k", "ke", "kee", "keep"]) {
    state = nextStreamerState(state)
    assert.equal(streamerVisible(state), expected)
  }
  state = nextStreamerState(state)
  assert.equal(state.phase, "holding")
  state = nextStreamerState(state)
  assert.equal(state.phase, "deleting")
  for (const expected of ["kee", "ke", "k", ""]) {
    state = nextStreamerState(state)
    assert.equal(streamerVisible(state), expected)
  }

  state = nextStreamerState(state)
  for (const expected of ["c", "cu", "cut"]) {
    state = nextStreamerState(state)
    assert.equal(streamerVisible(state), expected)
  }
  state = nextStreamerState(state)
  assert.equal(state.phase, "holding")
  state = nextStreamerState(state)
  while (streamerVisible(state) !== "") {
    state = nextStreamerState(state)
  }
  state = nextStreamerState(state)
  for (const expected of ["p", "pa", "pau", "paus", "pause"]) {
    state = nextStreamerState(state)
    assert.equal(streamerVisible(state), expected)
  }
  state = nextStreamerState(state)
  assert.equal(state.phase, "holding")
  state = nextStreamerState(state)
  assert.equal(state.phase, "deleting")
  while (streamerVisible(state) !== "") {
    state = nextStreamerState(state)
  }
  state = nextStreamerState(state)
  assert.equal(state.phase, "typing")
  assert.equal(state.wordIndex, 0)
  state = nextStreamerState(state)
  assert.equal(streamerVisible(state), "k")
  assert.notEqual(streamerVisible(state), "keep / cut / pause")
})

test("streamer delays stay slow and reduced-motion still loops words", () => {
  assert.ok(streamerDelayMs({ wordIndex: 0, charCount: 1, phase: "typing" }) >= 180)
  assert.ok(streamerDelayMs({ wordIndex: 0, charCount: 4, phase: "holding" }) >= 2400)
  assert.ok(streamerDelayMs({ wordIndex: 0, charCount: 2, phase: "deleting" }) >= 90)
  const hopped = jumpToNextWord({ wordIndex: 2, charCount: 5, phase: "holding" })
  assert.equal(hopped.wordIndex, 0)
  assert.equal(streamerVisible(hopped), "keep")
})

test("unsigned copy never includes the founder seed notebook", () => {
  const blob = allSigninCopy()
  for (const seed of SIGNIN_FORBIDDEN_SEED) {
    assert.equal(blob.includes(seed), false, `unsigned copy leaked ${seed}`)
  }
})

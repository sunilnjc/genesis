import assert from "node:assert/strict"
import test from "node:test"
import {
  SIGNIN_CONTEXT,
  SIGNIN_FORBIDDEN_SEED,
  SIGNIN_FORBIDDEN_STORY,
  SIGNIN_HEADLINE,
  STREAM_WORDS,
  STREAMER_INITIAL,
  STREAMER_SETTLED,
  allSigninCopy,
  nextStreamerState,
  streamerDelayMs,
  streamerVisible,
} from "../src/lib/signin-copy.ts"

test("unsigned login keeps one short line around a keep/cut/pause streamer", () => {
  const blob = allSigninCopy()
  assert.equal(SIGNIN_HEADLINE, "Sign in to your stack")
  assert.deepEqual([...STREAM_WORDS], ["keep", "cut", "pause"])
  assert.equal(STREAMER_SETTLED, "keep / cut / pause")
  assert.ok(SIGNIN_CONTEXT.length < 80)
  assert.match(SIGNIN_CONTEXT, /AI and dev tools/i)
  assert.ok(blob.split("\n").length <= 8)
  assert.doesNotMatch(blob, /Plaid/)
  assert.doesNotMatch(blob, /LinkedIn/)
  assert.doesNotMatch(blob, /Gmail/)
  for (const story of SIGNIN_FORBIDDEN_STORY) {
    assert.equal(blob.includes(story), false, `login copy still has long story: ${story}`)
  }
})

test("streamer types keep, holds, deletes, then cut, then pause", () => {
  let state = STREAMER_INITIAL
  assert.equal(streamerVisible(state), "")

  for (const expected of ["k", "ke", "kee", "keep"]) {
    state = nextStreamerState(state)
    assert.equal(streamerVisible(state), expected)
  }
  assert.equal(state.phase, "typing")
  state = nextStreamerState(state)
  assert.equal(state.phase, "holding")
  assert.equal(streamerVisible(state), "keep")

  state = nextStreamerState(state)
  assert.equal(state.phase, "deleting")
  for (const expected of ["kee", "ke", "k", ""]) {
    state = nextStreamerState(state)
    assert.equal(streamerVisible(state), expected)
  }

  state = nextStreamerState(state)
  assert.equal(state.phase, "typing")
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
  assert.equal(state.phase, "settled")
  assert.equal(streamerVisible(state), "keep / cut / pause")
  assert.equal(nextStreamerState(state).phase, "settled")
  assert.equal(streamerVisible(nextStreamerState(state)), STREAMER_SETTLED)
})

test("streamer delays are slow and it does not loop", () => {
  assert.ok(streamerDelayMs({ wordIndex: 0, charCount: 1, phase: "typing" }) >= 180)
  assert.ok(streamerDelayMs({ wordIndex: 0, charCount: 4, phase: "holding" }) >= 2400)
  assert.ok(streamerDelayMs({ wordIndex: 0, charCount: 2, phase: "deleting" }) >= 90)
  assert.equal(streamerDelayMs({ wordIndex: 2, charCount: 0, phase: "settled" }), 0)
})

test("unsigned copy never includes the founder seed notebook", () => {
  const blob = allSigninCopy()
  for (const seed of SIGNIN_FORBIDDEN_SEED) {
    assert.equal(blob.includes(seed), false, `unsigned copy leaked ${seed}`)
  }
})

/** Compact unsigned login copy. Keep founder seed names/prices out of this file. */

export const SIGNIN_BRAND = "RiteStack"
export const SIGNIN_HEADLINE = "Sign in to your stack"
export const SIGNIN_CONTEXT = "the AI and dev tools you pay for."

export const STREAM_WORDS = ["keep", "cut", "pause"] as const

export type StreamerPhase = "typing" | "holding" | "deleting"

export type StreamerState = {
  wordIndex: number
  charCount: number
  phase: StreamerPhase
}

export const STREAMER_INITIAL: StreamerState = {
  wordIndex: 0,
  charCount: 0,
  phase: "typing",
}

export function nextStreamerState(state: StreamerState): StreamerState {
  const word = STREAM_WORDS[state.wordIndex]
  if (state.phase === "typing") {
    if (state.charCount < word.length) {
      return { ...state, charCount: state.charCount + 1 }
    }
    return { ...state, phase: "holding" }
  }
  if (state.phase === "holding") {
    return { ...state, phase: "deleting" }
  }
  if (state.charCount > 0) {
    return { ...state, charCount: state.charCount - 1 }
  }
  return {
    wordIndex: (state.wordIndex + 1) % STREAM_WORDS.length,
    charCount: 0,
    phase: "typing",
  }
}

export function jumpToNextWord(state: StreamerState): StreamerState {
  const nextIndex = (state.wordIndex + 1) % STREAM_WORDS.length
  return {
    wordIndex: nextIndex,
    charCount: STREAM_WORDS[nextIndex].length,
    phase: "holding",
  }
}

export function streamerVisible(state: StreamerState): string {
  return STREAM_WORDS[state.wordIndex].slice(0, state.charCount)
}

export function streamerDelayMs(state: StreamerState, reducedMotion = false): number {
  if (reducedMotion) {
    if (state.phase === "holding") return 2600
    return 0
  }
  if (state.phase === "holding") return 2600
  if (state.phase === "deleting") return 95
  return 190
}

/** Strings that must never appear on the unsigned hosted page (founder notebook). */
export const SIGNIN_FORBIDDEN_SEED = [
  "OpenAI Pro+",
  "Cursor Pro",
  "CoinGecko",
  "Twitter (X)",
  "$445",
  "$200",
] as const

export const SIGNIN_FORBIDDEN_STORY = [
  "The problem",
  "The ritual",
  "What you walk away with",
  "Decide is not Inventory",
  "Seven days, then $14 once",
  "You don’t miss the cancel button",
] as const

export function allSigninCopy(): string {
  return [SIGNIN_BRAND, SIGNIN_HEADLINE, SIGNIN_CONTEXT, ...STREAM_WORDS].join("\n")
}

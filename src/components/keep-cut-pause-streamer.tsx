"use client"

import { useEffect, useState } from "react"
import {
  STREAM_WORDS,
  STREAMER_INITIAL,
  jumpToNextWord,
  nextStreamerState,
  streamerDelayMs,
  streamerVisible,
  type StreamerState,
} from "@/lib/signin-copy"

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function KeepCutPauseStreamer() {
  const [state, setState] = useState<StreamerState>(STREAMER_INITIAL)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reduced = prefersReducedMotion()
    setReducedMotion(reduced)
    if (reduced) {
      setState({
        wordIndex: 0,
        charCount: STREAM_WORDS[0].length,
        phase: "holding",
      })
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      setState((current) => (reducedMotion ? jumpToNextWord(current) : nextStreamerState(current)))
    }, streamerDelayMs(state, reducedMotion))
    return () => window.clearTimeout(timer)
  }, [ready, reducedMotion, state])

  const caretIdle = state.phase === "holding"

  return (
    <p
      data-ritestack-streamer="keep-cut-pause"
      data-cycle={STREAM_WORDS.join(",")}
      data-loop="true"
      aria-live="polite"
      className="font-mono text-base leading-none tracking-tight"
    >
      <span>{streamerVisible(state)}</span>
      <span
        aria-hidden="true"
        className={caretIdle ? "ritestack-caret ritestack-caret-idle" : "ritestack-caret"}
      />
    </p>
  )
}

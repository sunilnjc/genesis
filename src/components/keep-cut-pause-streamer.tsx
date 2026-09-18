"use client"

import { useEffect, useState } from "react"
import {
  STREAM_WORDS,
  STREAMER_INITIAL,
  nextStreamerState,
  streamerDelayMs,
  streamerVisible,
  type StreamerState,
} from "@/lib/signin-copy"
import { cn } from "@/lib/utils"

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function jumpToNextWord(state: StreamerState): StreamerState {
  const nextIndex = (state.wordIndex + 1) % STREAM_WORDS.length
  return {
    wordIndex: nextIndex,
    charCount: STREAM_WORDS[nextIndex].length,
    phase: "holding",
  }
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
    const delay = streamerDelayMs(state, reducedMotion)
    const timer = window.setTimeout(() => {
      setState((current) => (reducedMotion ? jumpToNextWord(current) : nextStreamerState(current)))
    }, delay)
    return () => window.clearTimeout(timer)
  }, [ready, reducedMotion, state])

  const word = streamerVisible(state)
  const caretIdle = state.phase === "holding"

  return (
    <p
      data-ritestack-streamer="keep-cut-pause"
      data-cycle={STREAM_WORDS.join(",")}
      aria-live="polite"
      className="font-mono text-2xl leading-none tracking-tight"
    >
      <span>{word}</span>
      <span
        aria-hidden="true"
        className={cn("ritestack-caret", caretIdle && "ritestack-caret-idle")}
      />
    </p>
  )
}

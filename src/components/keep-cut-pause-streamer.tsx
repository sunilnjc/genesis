"use client"

import { useEffect, useState } from "react"
import {
  STREAM_WORDS,
  STREAMER_INITIAL,
  STREAMER_SETTLED_STATE,
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setState(STREAMER_SETTLED_STATE)
      return
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || state.phase === "settled") return
    const timer = window.setTimeout(() => {
      setState((current) => nextStreamerState(current))
    }, streamerDelayMs(state))
    return () => window.clearTimeout(timer)
  }, [ready, state])

  const settled = state.phase === "settled"
  const caretIdle = state.phase === "holding"

  return (
    <p
      data-ritestack-streamer="keep-cut-pause"
      data-cycle={STREAM_WORDS.join(",")}
      data-settled={settled ? "true" : "false"}
      aria-live="polite"
      className="font-mono text-2xl leading-none tracking-tight"
    >
      <span>{streamerVisible(state)}</span>
      {settled ? null : (
        <span
          aria-hidden="true"
          className={caretIdle ? "ritestack-caret ritestack-caret-idle" : "ritestack-caret"}
        />
      )}
    </p>
  )
}

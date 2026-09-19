"use client"

import type { PaddleOverlay } from "@/lib/paddle"

type PaddleCheckoutEvent = { name?: string }

type PaddleJs = {
  Environment: { set: (value: "sandbox" | "production") => void }
  Initialize: (options: {
    token: string
    eventCallback?: (event: PaddleCheckoutEvent) => void
  }) => void
  Checkout: {
    open: (options: {
      transactionId: string
      settings?: { displayMode?: string; theme?: string; successUrl?: string }
    }) => void
  }
}

declare global {
  interface Window {
    Paddle?: PaddleJs
  }
}

let paddleReady: Promise<PaddleJs> | null = null
let initializedToken: string | null = null

function loadPaddleJs(): Promise<PaddleJs> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paddle.js only runs in the browser."))
  }
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (paddleReady) return paddleReady

  paddleReady = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-ritestack-paddle]")
    const script = existing ?? document.createElement("script")
    const onLoad = () => {
      if (!window.Paddle) {
        reject(new Error("Paddle.js did not load."))
        return
      }
      resolve(window.Paddle)
    }
    script.addEventListener("load", onLoad)
    script.addEventListener("error", () => reject(new Error("Paddle.js failed to load.")))
    if (!existing) {
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js"
      script.async = true
      script.dataset.ritestackPaddle = "1"
      document.head.appendChild(script)
    } else if (window.Paddle) {
      resolve(window.Paddle)
    }
  })

  return paddleReady
}

export async function openPaddleOverlay(
  overlay: PaddleOverlay,
  options: {
    successUrl: string
    onClosed?: () => void
  }
): Promise<void> {
  const paddle = await loadPaddleJs()
  paddle.Environment.set(overlay.environment === "live" ? "production" : "sandbox")
  if (initializedToken !== overlay.clientToken) {
    paddle.Initialize({
      token: overlay.clientToken,
      eventCallback(event) {
        if (event.name === "checkout.closed") options.onClosed?.()
        if (event.name === "checkout.completed") {
          window.location.assign(options.successUrl)
        }
      },
    })
    initializedToken = overlay.clientToken
  }
  paddle.Checkout.open({
    transactionId: overlay.transactionId,
    settings: {
      displayMode: "overlay",
      theme: "dark",
      successUrl: options.successUrl,
    },
  })
}

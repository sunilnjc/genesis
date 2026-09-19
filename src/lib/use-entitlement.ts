"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth"
import { billingAuthHeaders } from "@/lib/billing-auth"
import { checkedCheckoutUrl } from "@/lib/checkout-url"
import { entitlement, type Entitlement, type EntitlementState } from "@/lib/entitlement"

export type BillingStatus = Entitlement & {
  userId: string | null
  checkoutConfigured: boolean
  supabaseConfigured: boolean
  message: string
}

const LOCAL_UNLIMITED: BillingStatus = {
  ...entitlement({ hasSession: false, trialEndsAt: null, packPaidAt: null, checkoutEnabled: false }),
  userId: null,
  checkoutConfigured: false,
  supabaseConfigured: false,
  message: "Local list — full ritual while this browser has no login.",
}

function previewOverride(): EntitlementState | null {
  if (typeof window === "undefined") return null
  const host = window.location.hostname
  if (host !== "127.0.0.1" && host !== "localhost") return null
  const preview = new URLSearchParams(window.location.search).get("preview")
  if (preview === "paywall" || preview === "trial") return preview
  return null
}

function readSessionId(): string | null {
  if (typeof window === "undefined") return null
  const value = new URLSearchParams(window.location.search).get("session_id")
  return value && value.startsWith("cs_") ? value : null
}

export function useEntitlement() {
  const auth = useAuth()
  const accessToken = auth.session?.access_token ?? null
  const authReady = auth.status !== "loading"
  const [status, setStatus] = useState<BillingStatus>(LOCAL_UNLIMITED)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!authReady) return
    try {
      const sessionId = readSessionId()
      const path = sessionId
        ? `/api/billing/status?session_id=${encodeURIComponent(sessionId)}`
        : "/api/billing/status"
      const response = await fetch(path, {
        credentials: "same-origin",
        headers: billingAuthHeaders(accessToken),
      })
      const body = (await response.json()) as BillingStatus & { error?: string }
      if (!response.ok) {
        throw new Error(body.error || "Could not load billing status.")
      }
      setStatus(body)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load billing status.")
    } finally {
      setLoading(false)
    }
  }, [accessToken, authReady])

  useEffect(() => {
    if (!authReady) return
    // Network load once the cookie/JWT session is known, and after Checkout return.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on auth ready
    void refresh()
  }, [authReady, refresh])

  const display = useMemo((): BillingStatus => {
    const preview = previewOverride()
    if (preview === "paywall" && status.state !== "paid") {
      return {
        ...status,
        ritual: false,
        state: "paywall",
        daysLeft: 0,
        checkoutEnabled: status.checkoutConfigured,
        message:
          "Preview paywall (localhost only). Your list stays free. Unlock keep / cut / pause for $14 once.",
      }
    }
    if (preview === "trial") {
      return {
        ...status,
        ritual: true,
        state: "trial",
        daysLeft: status.daysLeft ?? 6,
        trialEndsAt: status.trialEndsAt,
        checkoutEnabled: status.checkoutConfigured,
        message: "Preview trial (localhost only). Ritual is unlocked for 7 days after signup.",
      }
    }
    return status
  }, [status])

  const unlock = useCallback(async () => {
    setCheckoutBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: billingAuthHeaders(accessToken),
      })
      const body = (await response.json()) as { url?: unknown; error?: string }
      if (!response.ok) {
        throw new Error(body.error || "Could not start Stripe Checkout.")
      }
      window.location.assign(checkedCheckoutUrl(body.url))
    } catch (cause) {
      setCheckoutBusy(false)
      setError(cause instanceof Error ? cause.message : "Could not start Stripe Checkout.")
    }
  }, [accessToken])

  return { status: display, loading, error, checkoutBusy, refresh, unlock }
}

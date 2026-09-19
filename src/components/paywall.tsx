"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { TrialCopyLine } from "@/components/trial-copy"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PACK_AMOUNT_DOLLARS } from "@/lib/entitlement"
import type { BillingStatus } from "@/lib/use-entitlement"

export function TrialBanner({ status }: { status: BillingStatus }) {
  return (
    <TrialCopyLine
      surface="signed-in"
      daysLeft={status.state === "trial" ? status.daysLeft : null}
    />
  )
}

export function PaywallCard({
  status,
  error,
  busy,
  onUnlock,
}: {
  status: BillingStatus
  error: string | null
  busy: boolean
  onUnlock: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unlock keep / cut / pause</CardTitle>
        <CardDescription>{status.message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Inventory stays free. The ritual — decide-by, keep / cut / pause, cancel URLs, and
          pause reminders — is ${PACK_AMOUNT_DOLLARS} once. Not a subscription.
        </p>
        {error ? (
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            <AlertTitle>Checkout didn’t start</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button className="h-11 w-full sm:w-auto" disabled={busy || !status.checkoutEnabled} onClick={onUnlock}>
          {busy
            ? "Opening Stripe…"
            : status.checkoutEnabled
              ? `Unlock RiteStack pack · $${PACK_AMOUNT_DOLLARS}`
              : "Stripe test key not set"}
        </Button>
        {!status.checkoutEnabled ? (
          <p className="text-[0.625rem] text-muted-foreground">
            Set <code>STRIPE_SECRET_KEY</code> (sk_test_) in <code>.env.local</code> or the
            Cloudflare Worker secrets, then restart.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

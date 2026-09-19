"use client"

import Link from "next/link"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AuthStatusChip, LoginScreen } from "@/components/auth-gate"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { canStartPackCheckout, PACK_AMOUNT_DOLLARS } from "@/lib/entitlement"
import { useEntitlement } from "@/lib/use-entitlement"

export function UnlockApp() {
  const auth = useAuth()
  const { status, loading, error, checkoutBusy, unlock } = useEntitlement()

  if (auth.configured && !auth.isLocalhost && auth.status !== "signed-in") {
    return <LoginScreen />
  }

  if (auth.status === "loading" || loading) {
    return (
      <div
        data-ritestack-screen="unlock-loading"
        className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10"
      >
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <p className="text-xs text-muted-foreground">Checking session…</p>
      </div>
    )
  }

  const paid = status.state === "paid"
  const trial = status.state === "trial"
  const canPay = canStartPackCheckout(status)

  return (
    <main
      data-ritestack-screen="unlock"
      data-ritestack-billing={status.state}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            RiteStack
          </p>
          <h1 className="font-heading text-xl font-medium tracking-tight">Unlock the pack</h1>
          <p className="text-xs text-muted-foreground">
            7 days full ritual. Then ${PACK_AMOUNT_DOLLARS} once.
          </p>
        </div>
        <AuthStatusChip />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>RiteStack pack</CardTitle>
          <CardDescription>One-time payment. Not a subscription.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-mono text-4xl font-medium tabular-nums tracking-tight">
            ${PACK_AMOUNT_DOLLARS}
          </p>
          <p className="text-xs text-muted-foreground">
            Keep / cut / pause, cancel URLs, and pause reminders. Inventory and monthly burn stay
            free.
          </p>
          {trial ? (
            <p className="text-xs text-muted-foreground" data-ritestack-unlock="trial-active">
              Trial is still active
              {status.daysLeft != null
                ? ` · ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`
                : ""}
              . Pay now if you want to walk Stripe.
            </p>
          ) : null}
          {paid ? (
            <Alert>
              <AlertTitle>Already unlocked</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          ) : (
            <Button
              className="h-11 w-full"
              disabled={checkoutBusy || !canPay}
              onClick={() => void unlock({ returnTo: "/unlock" })}
            >
              {checkoutBusy
                ? "Opening Stripe…"
                : canPay
                  ? `Pay / Unlock · $${PACK_AMOUNT_DOLLARS}`
                  : status.checkoutConfigured
                    ? "Sign in to start Checkout"
                    : "Stripe not configured"}
            </Button>
          )}
          {error ? (
            <Alert variant="destructive">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
              <AlertTitle>Checkout didn’t start</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-[0.625rem] text-muted-foreground">
        {status.stripeMode === "live"
          ? "Live Checkout. This charges a real card for $14 once."
          : "Stripe is still in test mode until live secrets are on the Worker. Test card 4242 4242 4242 4242."}
      </p>
      <Link href="/" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
        Back to Decide
      </Link>
    </main>
  )
}

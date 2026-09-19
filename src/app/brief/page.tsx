import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PACK_AMOUNT_DOLLARS, TRIAL_DAYS } from "@/lib/entitlement"

export const metadata: Metadata = {
  title: "Brief · RiteStack",
  description:
    "You don’t miss the cancel button. You miss a date to decide. Keep, cut, or pause — 7 days full ritual, then $14 once. Looking at your stack stays free.",
}

const RITUAL = [
  {
    action: "Keep",
    meaning: "Still earning its keep. Snooze until the next renew.",
  },
  {
    action: "Cut",
    meaning: "Open the cancel URL, mark it cut, burn drops.",
  },
  {
    action: "Pause",
    meaning: "Remind in 30 days. Unpause is the same ritual, later.",
  },
] as const

export default function BriefPage() {
  return (
    <main
      data-ritestack-screen="brief"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:py-14"
    >
      <header className="space-y-3">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RiteStack
        </p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">Brief</h1>
        <p className="font-heading text-lg font-medium tracking-tight text-foreground/90 sm:text-xl">
          You don’t miss the cancel button. You miss a date to decide.
        </p>
        <p className="max-w-xl text-sm text-muted-foreground">
          The list is inventory. The ritual is the product. Not a scanner. Not a cancel-for-you
          service.
        </p>
      </header>

      <section className="space-y-2" aria-labelledby="brief-problem">
        <h2
          id="brief-problem"
          className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase"
        >
          The problem
        </h2>
        <p className="text-sm/relaxed">
          Cursor, ChatGPT, Vercel, Notion, Figma, Linear, hosting, domains. You can name twelve of
          them without opening a bank. Another $20 still renews because nothing on the calendar said
          decide.
        </p>
        <p className="text-sm/relaxed text-muted-foreground">A prettier spreadsheet is not a win.</p>
      </section>

      <section className="space-y-3" aria-labelledby="brief-ritual">
        <div className="space-y-2">
          <h2
            id="brief-ritual"
            className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase"
          >
            The ritual
          </h2>
          <p className="text-sm/relaxed">
            Keep / cut / pause. One sitting. Not daily. A weekly glance, a monthly decision.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {RITUAL.map((row) => (
            <Card key={row.action} size="sm">
              <CardHeader>
                <CardTitle>{row.action}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs/relaxed text-muted-foreground">{row.meaning}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm/relaxed text-muted-foreground">
          Each row shows $, renew date, last-used (or unknown), and a cancel URL. If you leave
          without a decision, the sitting failed.
        </p>
      </section>

      <section className="space-y-2" aria-labelledby="brief-walk-away">
        <h2
          id="brief-walk-away"
          className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase"
        >
          What you walk away with
        </h2>
        <p className="text-sm/relaxed">
          A decide-by queue that’s empty. Monthly burn that matches what you still pay. A cut list
          with names, dollars, and the URL you actually used.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="brief-price">
        <h2
          id="brief-price"
          className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase"
        >
          Seven days, then ${PACK_AMOUNT_DOLLARS} once
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-3xl font-medium tabular-nums tracking-tight">
              ${PACK_AMOUNT_DOLLARS}
            </CardTitle>
            <CardDescription>Once. Not monthly. Not a subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm/relaxed">
              After you sign in, the ritual is unlocked for {TRIAL_DAYS} days. Then $
              {PACK_AMOUNT_DOLLARS} once.
            </p>
            <p className="text-sm/relaxed text-muted-foreground">
              {TRIAL_DAYS} days full ritual. Then ${PACK_AMOUNT_DOLLARS} once. Looking at your stack
              stays free.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="What is free and what $14 is not">
        <Card size="sm">
          <CardHeader>
            <Badge variant="outline">Stays free</Badge>
            <CardTitle className="mt-2">What stays free</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs/relaxed text-muted-foreground">
              Inventory. Monthly burn. Looking at the list and the queue.
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <Badge variant="secondary">Not lifetime everything</Badge>
            <CardTitle className="mt-2">What ${PACK_AMOUNT_DOLLARS} is not</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs/relaxed text-muted-foreground">
              Not a lifetime pass to every future feature.
            </p>
            <p className="text-xs/relaxed text-muted-foreground">
              ${PACK_AMOUNT_DOLLARS} is this ritual: keep / cut / pause, cancel URLs, reminders. A
              different job gets a different pack, with its own name and price. We will not fold
              that into ${PACK_AMOUNT_DOLLARS}.
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="flex flex-col gap-3 border-t border-foreground/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Sign in to run the ritual. Looking at this page stays free.
        </p>
        <Button asChild className="h-11 w-full sm:h-8 sm:w-auto">
          <Link href="/">Open RiteStack</Link>
        </Button>
      </footer>
    </main>
  )
}

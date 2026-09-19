import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About · RiteStack",
  description:
    "Keep / cut / pause for the AI and dev tools you pay for. 7 days full ritual. Then $14 once. Looking at your stack stays free.",
}

export default function AboutPage() {
  return (
    <main
      data-ritestack-screen="about"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10"
    >
      <header className="space-y-3">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RiteStack
        </p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">About</h1>
        <p className="text-sm text-muted-foreground">
          You don’t miss the cancel button. You miss a date to decide.
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="font-heading text-sm font-medium">What this is</h2>
        <p>
          A keep / cut / pause ritual for the AI and dev stack you already pay for — Cursor,
          ChatGPT, Vercel, Notion, Figma, Linear, hosting, domains, and the rest of that
          notebook.
        </p>
        <p className="text-muted-foreground">
          You add the names. Each row carries a cost, a renew date, last-used (or unknown),
          and a cancel URL. The list is inventory. The ritual is the product.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-medium">The pass</h2>
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
            <dt className="font-medium">Keep</dt>
            <dd className="text-muted-foreground">Snooze until the next renew.</dd>
          </div>
          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
            <dt className="font-medium">Cut</dt>
            <dd className="text-muted-foreground">
              Open the cancel URL, mark it gone, monthly burn drops.
            </dd>
          </div>
          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
            <dt className="font-medium">Pause</dt>
            <dd className="text-muted-foreground">Remind in 30 days. Unpause is part of the same pass.</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="font-heading text-sm font-medium">What this is not</h2>
        <p className="text-muted-foreground">
          Not a Gmail scanner. Not Plaid. We don’t read your inbox or sync a bank feed. You
          already know the tools. Looking at the list does not require a scrape.
        </p>
        <p className="text-muted-foreground">
          Not{" "}
          <a
            href="https://www.subscriptiongraveyard.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            subscriptiongraveyard.com
          </a>
          . That product hunts subscriptions in mail. RiteStack is a decide date for a stack
          you typed yourself.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed" data-ritestack-copy="pricing">
        <h2 className="font-heading text-sm font-medium">What it costs</h2>
        <p>7 days full ritual. Then $14 once. Looking at your stack stays free.</p>
        <p className="text-muted-foreground">
          After signup, keep / cut / pause, cancel URLs, and pause reminders are unlocked for
          a week. Day 8, the ritual waits until one Stripe Checkout. Not monthly. Not a
          subscription. Not a lifetime pass to every future feature.
        </p>
        <p className="text-muted-foreground">
          Inventory, burn, and looking at the list stay free after the week. $14 is this
          decide ritual only.
        </p>
      </section>

      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Open the app
        </Link>
        <Link href="/feedback" className="underline-offset-4 hover:underline">
          Feedback
        </Link>
      </nav>
    </main>
  )
}

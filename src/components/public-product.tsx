import type { ReactNode } from "react"
import Link from "next/link"
import { TRIAL_PACK_COPY } from "@/lib/trial-copy"

export function PublicProduct({ children }: { children: ReactNode }) {
  return (
    <main data-ritestack-screen="product" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 md:py-16">
      <header className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium tracking-[0.14em] uppercase">RiteStack</p>
        <nav aria-label="Product" className="flex gap-5 text-sm text-muted-foreground">
          <Link href="/brief#brief-price" className="hover:text-foreground">Pricing</Link>
          <a href="#sign-in" className="hover:text-foreground">Sign in</a>
        </nav>
      </header>
      <div className="grid items-start gap-10 md:grid-cols-[1.3fr_1fr] md:gap-16">
        <section className="space-y-6" aria-labelledby="product-title">
          <p className="text-xs text-muted-foreground">For the AI and developer tools you pay for</p>
          <h1 id="product-title" className="max-w-xl font-heading text-4xl font-medium leading-tight tracking-tight md:text-5xl">Know what stays.<br />Decide what goes.</h1>
          <p className="max-w-xl text-base/relaxed text-muted-foreground">
            RiteStack is a web app for tracking your tool subscriptions and deciding what to keep,
            cut, or pause. Add your tools, monthly costs, renewal dates, and cancel links. See what
            you still pay and make the next decision before renewal.
          </p>
          <p className="text-sm/relaxed">{TRIAL_PACK_COPY}</p>
          <Link href="/brief" className="inline-block text-sm underline underline-offset-4">See how RiteStack works and what’s included</Link>
        </section>
        {children}
      </div>
      <section aria-label="How RiteStack works" className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Add your stack", "Type the tools you pay for, the monthly cost, and the next renewal. Set last-used yourself, or leave it unknown."],
          ["2. Keep, cut, or pause", "Review your tools in Decide. Keep what you use, record a cut, or pause with a reminder in 30 days. Complete cancellations on the provider’s site."],
          ["3. See what changed", "Inventory shows your full list and monthly burn. Cuts keeps the tools you cut, their cut dates, and cancel links. Viewing your stack stays free."],
        ].map(([title, body]) => (
          <article key={title} className="space-y-3 rounded-xl border border-foreground/10 bg-card p-5">
            <h2 className="text-base font-medium">{title}</h2>
            <p className="text-sm/relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
      <section aria-labelledby="public-pricing" className="grid gap-6 border-t border-foreground/10 pt-8 sm:grid-cols-2">
        <div className="space-y-3">
          <h2 id="public-pricing" className="text-xl font-medium">The RiteStack ritual · $14 once</h2>
          <p className="text-sm/relaxed text-muted-foreground">Keep / cut / pause, cancel links, and pause reminders. One payment for this ritual. A different product later is a different pack.</p>
          <p className="text-sm/relaxed text-muted-foreground">Inventory, monthly burn, and viewing your cut receipts stay free. Your personal stack requires sign-in.</p>
        </div>
        <div className="space-y-3 text-sm/relaxed text-muted-foreground">
          <p>RiteStack is operated by Sunilkumar Kalabandi, United Arab Emirates. Contact <a href="mailto:hello@ritestack.app" className="underline underline-offset-4">hello@ritestack.app</a>.</p>
          <p>Paddle.com is the Merchant of Record. For a refund, contact us within 14 days of purchase; see our <Link href="/refund" className="underline underline-offset-4">refund policy</Link>.</p>
          <div className="flex gap-4"><Link href="/terms" className="underline underline-offset-4">Terms</Link><Link href="/privacy" className="underline underline-offset-4">Privacy</Link></div>
        </div>
      </section>
    </main>
  )
}

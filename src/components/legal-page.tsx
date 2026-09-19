import Link from "next/link"
import type { ReactNode } from "react"
import {
  CONTACT_EMAIL,
  LEGAL_FOOTER_LINKS,
  LEGAL_UPDATED,
  type LegalScreen,
} from "@/lib/legal"

export function LegalPage({
  screen,
  title,
  lede,
  children,
}: {
  screen: LegalScreen
  title: string
  lede: string
  children: ReactNode
}) {
  return (
    <main
      data-ritestack-screen={screen}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10"
    >
      <header className="space-y-3">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RiteStack
        </p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{lede}</p>
      </header>

      {children}

      <p className="text-xs text-muted-foreground">Last updated {LEGAL_UPDATED}.</p>

      <nav
        aria-label="Legal"
        className="flex flex-wrap gap-x-4 gap-y-2 border-t border-foreground/10 pt-6 text-xs text-muted-foreground"
      >
        {LEGAL_FOOTER_LINKS.map((link) =>
          link.screen === screen ? (
            <span key={link.href} className="text-foreground">
              {link.label}
            </span>
          ) : (
            <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline">
              {link.label}
            </Link>
          )
        )}
        <Link href="/about" className="underline-offset-4 hover:underline">
          About
        </Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline-offset-4 hover:underline">
          {CONTACT_EMAIL}
        </a>
      </nav>
    </main>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 text-sm leading-relaxed">
      <h2 className="font-heading text-sm font-medium">{heading}</h2>
      {children}
    </section>
  )
}

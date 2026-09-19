import Link from "next/link"
import { SITE_FOOTER_COPYRIGHT, SITE_FOOTER_LINKS } from "@/lib/site-footer"

export function SiteFooter() {
  return (
    <footer
      data-ritestack-footer="site"
      className="mt-auto flex-shrink-0 border-t border-foreground/10 bg-background"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-4 md:py-5 md:pb-5">
        <p className="text-[0.625rem] tracking-wide text-muted-foreground">{SITE_FOOTER_COPYRIGHT}</p>
        <nav aria-label="Site" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {SITE_FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

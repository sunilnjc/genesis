/** Quiet site chrome. Keep this out of the login wall copy. */

export const SITE_FOOTER_COPYRIGHT = "© 2026 RiteStack"

export const SITE_FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/feedback", label: "Feedback" },
  { href: "/brief", label: "Brief" },
] as const

export function siteFooterText(): string {
  return [SITE_FOOTER_COPYRIGHT, ...SITE_FOOTER_LINKS.map((link) => link.label)].join("\n")
}

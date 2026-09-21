/** Quiet site chrome. Keep this out of the login wall copy. */

export const SITE_FOOTER_COPYRIGHT = "© 2026 RiteStack"

export const SITE_FOOTER_LINKS = [
  { href: "/", label: "Decide" },
  { href: "/inventory", label: "Inventory" },
  { href: "/cuts", label: "Cuts" },
  { href: "/about", label: "About" },
  { href: "/feedback", label: "Feedback" },
  { href: "/brief", label: "Brief" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
] as const

export function siteFooterText(): string {
  return [SITE_FOOTER_COPYRIGHT, ...SITE_FOOTER_LINKS.map((link) => link.label)].join("\n")
}

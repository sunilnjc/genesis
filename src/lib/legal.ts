/** Operator facts for public legal pages. Paddle checks the legal name on the live site. */

export const LEGAL_NAME = "Sunilkumar Kalabandi"
export const OPERATING_NAME = "RiteStack"
export const PRODUCT_NAME = "RiteStack"
export const PRODUCT_URL = "https://ritestack.app"
export const CONTACT_EMAIL = "hello@ritestack.app"
export const PADDLE_BUYER_SUPPORT = "https://paddle.net"
export const LEGAL_UPDATED = "19 September 2026"
export const REFUND_WINDOW_DAYS = 14

/** Exact reseller sentence from the Paddle seller handbook. */
export const PADDLE_MOR_NOTICE =
  "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns."

export const OPERATOR_LINE = `${LEGAL_NAME}, an individual in the United Arab Emirates, operating as ${OPERATING_NAME}.`

export const LEGAL_FOOTER_LINKS = [
  { href: "/terms", label: "Terms", screen: "terms" },
  { href: "/privacy", label: "Privacy", screen: "privacy" },
  { href: "/refund", label: "Refund", screen: "refund" },
] as const

export type LegalScreen = (typeof LEGAL_FOOTER_LINKS)[number]["screen"]

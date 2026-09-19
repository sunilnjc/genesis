export const STRIPE_CHECKOUT_HOST = "checkout.stripe.com"

const PADDLE_CHECKOUT_HOSTS = new Set([
  "buy.paddle.com",
  "sandbox-buy.paddle.com",
  "checkout.paddle.com",
  "sandbox-checkout.paddle.com",
  "pay.paddle.com",
  "sandbox-pay.paddle.com",
])

function httpsUrl(url: unknown): URL {
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Checkout did not return a URL.")
  }
  const parsed = new URL(url)
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
    throw new Error("Checkout URL was not a trusted HTTPS host.")
  }
  return parsed
}

export function checkedStripeCheckoutUrl(url: unknown): string {
  const parsed = httpsUrl(url)
  if (parsed.hostname !== STRIPE_CHECKOUT_HOST) {
    throw new Error("Checkout URL was not hosted on checkout.stripe.com.")
  }
  return url as string
}

/** @deprecated Stripe-only name. Prefer checkedCheckoutUrl. */
export function checkedCheckoutUrl(url: unknown): string {
  return checkedStripeCheckoutUrl(url)
}

export function checkedPaddleCheckoutUrl(url: unknown, appUrl: string): string {
  const parsed = httpsUrl(url)
  if (PADDLE_CHECKOUT_HOSTS.has(parsed.hostname)) {
    return url as string
  }
  let appHost = ""
  try {
    appHost = new URL(appUrl).hostname
  } catch {
    appHost = ""
  }
  const txn = parsed.searchParams.get("_ptxn") ?? ""
  if (appHost && parsed.hostname === appHost && txn.startsWith("txn_")) {
    return url as string
  }
  throw new Error("Checkout URL was not a Paddle checkout or this app’s overlay link.")
}

export function checkedProviderCheckoutUrl(
  url: unknown,
  provider: "paddle" | "stripe",
  appUrl = "https://ritestack.app"
): string {
  return provider === "paddle" ? checkedPaddleCheckoutUrl(url, appUrl) : checkedStripeCheckoutUrl(url)
}

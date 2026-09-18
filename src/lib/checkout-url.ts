export const STRIPE_CHECKOUT_HOST = "checkout.stripe.com"

export function checkedCheckoutUrl(url: unknown): string {
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Stripe did not return a Checkout URL.")
  }
  const parsed = new URL(url)
  if (parsed.protocol !== "https:" || parsed.hostname !== STRIPE_CHECKOUT_HOST) {
    throw new Error("Checkout URL was not hosted on checkout.stripe.com.")
  }
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error("Checkout URL was not hosted on checkout.stripe.com.")
  }
  return url
}

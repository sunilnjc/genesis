import { PACK_AMOUNT_CENTS, PACK_NAME, PACK_SKU } from "./entitlement.ts"

export const STRIPE_API = "https://api.stripe.com/v1"
export const STRIPE_API_VERSION = "2024-06-20"
export { checkedCheckoutUrl } from "./checkout-url.ts"

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StripeConfigError"
  }
}

export type StripeConfig = {
  secretKey: string
  webhookSecret: string | null
  priceId: string | null
  appUrl: string
}

export function readStripeConfig(env: NodeJS.Dict<string> = process.env): StripeConfig {
  const secretKey = (env.STRIPE_SECRET_KEY ?? "").trim()
  if (!secretKey) {
    throw new StripeConfigError(
      "STRIPE_SECRET_KEY is not set. Use a Stripe test-mode secret (sk_test_…) in .env.local or Cloudflare Worker secrets."
    )
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new StripeConfigError(
      "RiteStack checkout is test-mode only this weekend. Refusing a non-sk_test_ key."
    )
  }

  const appUrl = (env.NEXT_PUBLIC_APP_URL ?? env.APP_URL ?? "").trim().replace(/\/$/, "")
  if (!appUrl) {
    throw new StripeConfigError("NEXT_PUBLIC_APP_URL is not set (e.g. http://127.0.0.1:4355 or https://ritestack.app).")
  }

  const webhookSecret = (env.STRIPE_WEBHOOK_SECRET ?? "").trim() || null
  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    throw new StripeConfigError("STRIPE_WEBHOOK_SECRET must be a Stripe endpoint secret (whsec_…).")
  }

  const priceId = (env.STRIPE_PRICE_ID ?? "").trim() || null
  if (priceId && !priceId.startsWith("price_")) {
    throw new StripeConfigError("STRIPE_PRICE_ID must be a Stripe price id (price_…) for the $14 pack.")
  }

  return { secretKey, webhookSecret, priceId, appUrl }
}

export function stripeConfigured(env: NodeJS.Dict<string> = process.env): boolean {
  try {
    readStripeConfig(env)
    return true
  } catch {
    return false
  }
}

export type CheckoutFields = Record<string, string>

export function checkoutSessionFields(input: {
  appUrl: string
  priceId: string | null
  userId: string
  email?: string | null
}): CheckoutFields {
  const success = `${input.appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`
  const cancel = `${input.appUrl}/?checkout=cancel`
  const fields: CheckoutFields = {
    mode: "payment",
    success_url: success,
    cancel_url: cancel,
    client_reference_id: input.userId,
    "metadata[user_id]": input.userId,
    "metadata[sku]": PACK_SKU,
    "payment_intent_data[metadata][user_id]": input.userId,
    "payment_intent_data[metadata][sku]": PACK_SKU,
  }

  if (input.priceId) {
    fields["line_items[0][price]"] = input.priceId
    fields["line_items[0][quantity]"] = "1"
  } else {
    fields["line_items[0][quantity]"] = "1"
    fields["line_items[0][price_data][currency]"] = "usd"
    fields["line_items[0][price_data][unit_amount]"] = String(PACK_AMOUNT_CENTS)
    fields["line_items[0][price_data][product_data][name]"] = PACK_NAME
    fields["line_items[0][price_data][product_data][metadata][sku]"] = PACK_SKU
  }

  if (input.email) {
    fields.customer_email = input.email
  }

  return fields
}

export function encodeStripeForm(fields: CheckoutFields): string {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, value)
  }
  return body.toString()
}

export function parseStripeSignatureHeader(header: string): { timestamp: number; signatures: string[] } {
  const timestampPart = header.split(",").find((part) => part.startsWith("t="))
  const signatures = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
  const timestamp = Number(timestampPart?.slice(2))
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("Stripe-Signature header is missing t= or v1=.")
  }
  return { timestamp, signatures }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function verifyStripeWebhook(
  payload: string,
  header: string,
  secret: string,
  nowMs = Date.now(),
  toleranceSec = 300
): Promise<boolean> {
  if (!secret.startsWith("whsec_")) return false
  const { timestamp, signatures } = parseStripeSignatureHeader(header)
  if (Math.abs(nowMs / 1000 - timestamp) > toleranceSec) return false
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`)
  return signatures.some((signature) => timingSafeEqual(signature, expected))
}

export type PaidCheckout = {
  sessionId: string
  userId: string
  customerId: string | null
  email: string | null
  amountTotal: number
}

export function paidCheckoutFromSession(session: unknown): PaidCheckout | null {
  if (!session || typeof session !== "object") return null
  const row = session as Record<string, unknown>
  if (row.object !== "checkout.session") return null
  if (row.mode !== "payment") return null
  if (row.payment_status !== "paid") return null
  if (row.status && row.status !== "complete") return null
  const amount = row.amount_total
  if (amount !== PACK_AMOUNT_CENTS) return null
  const metadata = row.metadata
  const meta =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {}
  const fromMeta = typeof meta.user_id === "string" ? meta.user_id : ""
  const fromRef = typeof row.client_reference_id === "string" ? row.client_reference_id : ""
  const userId = fromMeta || fromRef
  if (!userId) return null
  if (meta.sku && meta.sku !== PACK_SKU) return null
  const sessionId = typeof row.id === "string" ? row.id : ""
  if (!sessionId.startsWith("cs_")) return null
  const customer = row.customer
  const customerId = typeof customer === "string" ? customer : null
  const email =
    typeof row.customer_email === "string"
      ? row.customer_email
      : typeof row.customer_details === "object" &&
          row.customer_details &&
          typeof (row.customer_details as { email?: unknown }).email === "string"
        ? (row.customer_details as { email: string }).email
        : null
  return { sessionId, userId, customerId, email, amountTotal: PACK_AMOUNT_CENTS }
}

export async function stripeRequest(
  config: StripeConfig,
  method: "GET" | "POST",
  path: string,
  fields?: CheckoutFields
): Promise<unknown> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: fields ? encodeStripeForm(fields) : undefined,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? "Stripe request failed")
        : `Stripe request failed (${response.status})`
    throw new Error(message)
  }
  return body
}

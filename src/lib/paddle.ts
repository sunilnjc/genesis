import {
  checkoutReturnPath,
  type CheckoutReturnPath,
} from "./checkout-return.ts"
import { PACK_SKU } from "./entitlement.ts"
import { hmacSha256Hex, timingSafeEqual } from "./hmac.ts"
import type { PaidCheckout } from "./stripe.ts"

export const PADDLE_SANDBOX_API = "https://sandbox-api.paddle.com"
export const PADDLE_LIVE_API = "https://api.paddle.com"
export const PADDLE_WEBHOOK_PATH = "/api/billing/paddle-webhook"

export type PaddleEnv = "sandbox" | "live"
export type CheckoutProvider = "paddle" | "stripe"

export class PaddleConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PaddleConfigError"
  }
}

export type PaddleConfig = {
  apiKey: string
  webhookSecret: string
  priceId: string
  env: PaddleEnv
  appUrl: string
  apiBase: string
}

export type PaddleOverlay = {
  transactionId: string
  environment: PaddleEnv
  clientToken: string
}

export function readPaddleEnv(env: NodeJS.Dict<string> = process.env): PaddleEnv | null {
  const raw = (env.PADDLE_ENV ?? "").trim().toLowerCase()
  if (raw === "sandbox" || raw === "live") return raw
  return null
}

export function paddleConfigured(env: NodeJS.Dict<string> = process.env): boolean {
  try {
    readPaddleConfig(env)
    return true
  } catch {
    return false
  }
}

export function readPaddleConfig(env: NodeJS.Dict<string> = process.env): PaddleConfig {
  const apiKey = (env.PADDLE_API_KEY ?? "").trim()
  const webhookSecret = (env.PADDLE_WEBHOOK_SECRET ?? "").trim()
  const priceId = (env.PADDLE_PRICE_ID ?? "").trim()
  const paddleEnv = readPaddleEnv(env)
  const appUrl = (env.NEXT_PUBLIC_APP_URL ?? env.APP_URL ?? "").trim().replace(/\/$/, "")

  if (!apiKey) {
    throw new PaddleConfigError(
      "PADDLE_API_KEY is not set. Put it on the Worker with wrangler secret put after you say “Paddle is ready”. Do not paste keys into chat."
    )
  }
  if (!webhookSecret) {
    throw new PaddleConfigError(
      "PADDLE_WEBHOOK_SECRET is not set. Checkout stays off until the webhook can grant pack_paid_at."
    )
  }
  if (!priceId || !priceId.startsWith("pri_")) {
    throw new PaddleConfigError("PADDLE_PRICE_ID must be a Paddle price id (pri_…) for the $14 pack.")
  }
  if (!paddleEnv) {
    throw new PaddleConfigError("PADDLE_ENV must be sandbox or live.")
  }
  if (!appUrl) {
    throw new PaddleConfigError("NEXT_PUBLIC_APP_URL is not set (e.g. http://127.0.0.1:4317 or https://ritestack.app).")
  }

  return {
    apiKey,
    webhookSecret,
    priceId,
    env: paddleEnv,
    appUrl,
    apiBase: paddleEnv === "live" ? PADDLE_LIVE_API : PADDLE_SANDBOX_API,
  }
}

export function parsePaddleSignatureHeader(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(";").map((part) => part.trim()).filter(Boolean)
  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3) ?? ""
  const signatures = parts.filter((part) => part.startsWith("h1=")).map((part) => part.slice(3))
  if (!timestamp || signatures.length === 0) {
    throw new Error("Paddle-Signature header is missing ts= or h1=.")
  }
  return { timestamp, signatures }
}

export async function verifyPaddleWebhook(
  payload: string,
  header: string,
  secret: string,
  nowMs = Date.now(),
  toleranceSec = 300
): Promise<boolean> {
  if (!secret || !header) return false
  let parsed: { timestamp: string; signatures: string[] }
  try {
    parsed = parsePaddleSignatureHeader(header)
  } catch {
    return false
  }
  const timestamp = Number(parsed.timestamp)
  if (!Number.isFinite(timestamp)) return false
  if (Math.abs(nowMs / 1000 - timestamp) > toleranceSec) return false
  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}:${payload}`)
  return parsed.signatures.some((signature) => timingSafeEqual(signature, expected))
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function customData(value: unknown): Record<string, unknown> {
  return record(value) ?? {}
}

function itemPriceId(item: unknown): string {
  const row = record(item)
  if (!row) return ""
  if (typeof row.price_id === "string") return row.price_id
  const price = record(row.price)
  return typeof price?.id === "string" ? price.id : ""
}

function transactionPriceIds(transaction: Record<string, unknown>): string[] {
  const ids: string[] = []
  const items = Array.isArray(transaction.items) ? transaction.items : []
  for (const item of items) {
    const id = itemPriceId(item)
    if (id) ids.push(id)
  }
  const details = record(transaction.details)
  const lineItems = Array.isArray(details?.line_items) ? details.line_items : []
  for (const item of lineItems) {
    const id = itemPriceId(item)
    if (id) ids.push(id)
  }
  return ids
}

export function paidCheckoutFromPaddleTransaction(
  transaction: unknown,
  priceId: string
): PaidCheckout | null {
  const row = record(transaction)
  if (!row) return null
  if (row.status !== "completed") return null
  const id = typeof row.id === "string" ? row.id : ""
  if (!id.startsWith("txn_")) return null
  const meta = customData(row.custom_data)
  const userId = typeof meta.user_id === "string" ? meta.user_id : ""
  if (!userId) return null
  if (meta.sku && meta.sku !== PACK_SKU) return null
  if (!transactionPriceIds(row).includes(priceId)) return null
  const customer = row.customer_id
  const customerId = typeof customer === "string" ? customer : null
  const email =
    typeof meta.customer_email === "string"
      ? meta.customer_email
      : typeof row.customer_email === "string"
        ? row.customer_email
        : null
  return { sessionId: id, userId, customerId, email, amountTotal: 1400 }
}

export function paidCheckoutFromPaddleEvent(event: unknown, priceId: string): PaidCheckout | null {
  const row = record(event)
  if (!row) return null
  const type = typeof row.event_type === "string" ? row.event_type : ""
  if (type !== "transaction.completed") return null
  return paidCheckoutFromPaddleTransaction(row.data, priceId)
}

export type PaddleWebhookResult = {
  status: number
  body: Record<string, unknown>
  paid: PaidCheckout | null
}

export async function handlePaddleWebhook(
  raw: string,
  signatureHeader: string,
  env: NodeJS.Dict<string> = process.env
): Promise<PaddleWebhookResult> {
  let config: PaddleConfig
  try {
    config = readPaddleConfig(env)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paddle is not configured."
    return { status: 503, body: { error: message }, paid: null }
  }

  const ok = await verifyPaddleWebhook(raw, signatureHeader, config.webhookSecret)
  if (!ok) {
    return { status: 400, body: { error: "Invalid Paddle signature." }, paid: null }
  }

  let event: unknown
  try {
    event = JSON.parse(raw) as unknown
  } catch {
    return { status: 400, body: { error: "Invalid JSON." }, paid: null }
  }

  const paid = paidCheckoutFromPaddleEvent(event, config.priceId)
  return { status: 200, body: { received: true }, paid }
}

async function paddleRequest(
  config: PaddleConfig,
  method: "GET" | "POST",
  path: string,
  json?: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${config.apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Paddle-Version": "1",
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body: json ? JSON.stringify(json) : undefined,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: { detail?: string } }).error?.detail ?? "Paddle request failed")
        : `Paddle request failed (${response.status})`
    throw new Error(detail)
  }
  return body
}

export async function paddleClientToken(config: PaddleConfig): Promise<string | null> {
  const body = await paddleRequest(config, "GET", "/client-tokens?status=active&per_page=1")
  const row = record(body)
  const data = Array.isArray(row?.data) ? row.data : []
  const first = record(data[0])
  const token = typeof first?.token === "string" ? first.token : ""
  return token || null
}

export function paddleSuccessUrl(appUrl: string, returnTo: CheckoutReturnPath): string {
  const path = returnTo === "/unlock" ? "/unlock" : "/"
  return `${appUrl}${path === "/" ? "/" : path}?checkout=success`
}

export async function createPaddleCheckout(
  config: PaddleConfig,
  input: {
    userId: string
    email?: string | null
    returnTo?: CheckoutReturnPath
  }
): Promise<{ url: string; overlay: PaddleOverlay | null }> {
  const returnTo = checkoutReturnPath(input.returnTo)
  const landing = `${config.appUrl}${returnTo === "/unlock" ? "/unlock" : "/"}`
  const custom_data: Record<string, string> = {
    user_id: input.userId,
    sku: PACK_SKU,
  }
  if (input.email) custom_data.customer_email = input.email

  const created = await paddleRequest(config, "POST", "/transactions", {
    items: [{ price_id: config.priceId, quantity: 1 }],
    collection_mode: "automatic",
    custom_data,
    checkout: { url: landing },
  })
  const data = record(record(created)?.data) ?? record(created)
  const transactionId = typeof data?.id === "string" ? data.id : ""
  if (!transactionId.startsWith("txn_")) {
    throw new Error("Paddle did not return a transaction id.")
  }
  const checkout = record(data?.checkout)
  const checkoutUrl = typeof checkout?.url === "string" ? checkout.url : `${landing}?_ptxn=${encodeURIComponent(transactionId)}`

  let clientToken: string | null = null
  try {
    clientToken = await paddleClientToken(config)
  } catch {
    clientToken = null
  }

  if (!clientToken) {
    throw new Error(
      "Paddle has no active client-side token. Create one in Paddle → Developer tools → Authentication. The Worker reads it with PADDLE_API_KEY; do not paste tokens into chat."
    )
  }

  return {
    url: checkoutUrl,
    overlay: { transactionId, environment: config.env, clientToken },
  }
}

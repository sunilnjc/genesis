import { jwtFromRequest } from "@/lib/billing-auth"
import { checkoutSignInError } from "@/lib/checkout-access"
import { checkoutReturnPathFromRequest } from "@/lib/checkout-return"
import { entitlement, type Entitlement } from "@/lib/entitlement"
import {
  createPaddleCheckout,
  paddleConfigured,
  readPaddleConfig,
  type CheckoutProvider,
  type PaddleEnv,
  type PaddleOverlay,
} from "@/lib/paddle"
import {
  authUserFromJwt,
  ensureOwnProfile,
  markProfilePaid,
  readSupabaseConfig,
  type AuthUser,
  type ProfileRow,
} from "@/lib/supabase-admin"
import {
  checkedStripeCheckoutUrl,
  checkoutSessionFields,
  paidCheckoutFromSession,
  readStripeConfig,
  stripeConfigured,
  stripeRequest,
  type PaidCheckout,
  type StripeMode,
} from "@/lib/stripe"

const LOCAL_USER_COOKIE = "ritestack_local_id"
const PACK_COOKIE = "ritestack_pack_session"

export type BillingStatus = Entitlement & {
  userId: string | null
  checkoutConfigured: boolean
  checkoutProvider: CheckoutProvider | null
  supabaseConfigured: boolean
  stripeMode: StripeMode | null
  paddleEnv: PaddleEnv | null
  message: string
}

export async function currentUser(request: Request): Promise<AuthUser | null> {
  const config = readSupabaseConfig()
  const jwt = jwtFromRequest(request)
  if (!config || !jwt) return null
  return authUserFromJwt(config, jwt)
}

export function localUserIdFrom(request: Request): string {
  const cookie = request.headers.get("cookie") ?? ""
  const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${LOCAL_USER_COOKIE}=`))
  const value = match?.slice(LOCAL_USER_COOKIE.length + 1) ?? ""
  if (/^[0-9a-f-]{36}$/i.test(value)) return value
  return crypto.randomUUID()
}

export function localUserCookie(id: string): string {
  return `${LOCAL_USER_COOKIE}=${id}; Path=/; SameSite=Lax; HttpOnly; Max-Age=31536000`
}

function packSessionFrom(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? ""
  const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${PACK_COOKIE}=`))
  const value = match?.slice(PACK_COOKIE.length + 1) ?? ""
  return value.startsWith("cs_") ? value : null
}

export function packSessionCookie(sessionId: string): string {
  return `${PACK_COOKIE}=${sessionId}; Path=/; SameSite=Lax; HttpOnly; Max-Age=31536000`
}

function statusMessage(row: Entitlement): string {
  switch (row.state) {
    case "local":
      return "Local list — full ritual while this browser has no login. Hosted accounts get 7 days, then $14."
    case "trial":
      return row.daysLeft === 1
        ? "Trial · 1 day left. Keep / cut / pause stays unlocked."
        : `Trial · ${row.daysLeft ?? 0} days left. Keep / cut / pause stays unlocked.`
    case "paid":
      return "RiteStack pack is unlocked. Ritual, cancel URLs, and pause reminders are included."
    case "paywall":
      return "Trial ended. Your list stays free. Unlock keep / cut / pause, cancel URLs, and reminders for $14 once."
  }
}

export function checkoutProviderFromEnv(
  env: NodeJS.Dict<string> = process.env
): { provider: CheckoutProvider | null; paddleEnv: PaddleEnv | null; stripeMode: StripeMode | null } {
  if (paddleConfigured(env)) {
    return { provider: "paddle", paddleEnv: readPaddleConfig(env).env, stripeMode: null }
  }
  if (stripeConfigured(env)) {
    return { provider: "stripe", paddleEnv: null, stripeMode: readStripeConfig(env).stripeMode }
  }
  return { provider: null, paddleEnv: null, stripeMode: null }
}

export async function billingStatus(request: Request): Promise<{
  status: BillingStatus
  setCookies: string[]
}> {
  const setCookies: string[] = []
  const supabase = readSupabaseConfig()
  const { provider, paddleEnv, stripeMode } = checkoutProviderFromEnv()
  const checkoutConfigured = provider !== null
  const user = await currentUser(request)
  let profile: ProfileRow | null = null

  if (user && supabase) {
    profile = await ensureOwnProfile(supabase, jwtFromRequest(request))
  }

  let packPaidAt = profile?.pack_paid_at ?? null
  const localId = localUserIdFrom(request)
  if (!user) setCookies.push(localUserCookie(localId))

  const claimedSession =
    new URL(request.url).searchParams.get("session_id") ?? packSessionFrom(request)
  // Stripe test retrieve is signed by Stripe. Paddle grants only from a verified webhook.
  if (!packPaidAt && claimedSession && provider === "stripe") {
    const paid = await retrievePaidCheckout(claimedSession)
    const expectedId = user?.id ?? localId
    if (paid && paid.userId === expectedId) {
      packPaidAt = new Date().toISOString()
      setCookies.push(packSessionCookie(paid.sessionId))
      await persistPaid(paid)
    }
  }

  const row = entitlement({
    hasSession: Boolean(user),
    trialEndsAt: profile?.trial_ends_at ?? null,
    packPaidAt,
    checkoutEnabled: checkoutConfigured && (Boolean(user) || !supabase),
  })

  return {
    status: {
      ...row,
      userId: user?.id ?? (supabase ? null : localId),
      checkoutConfigured,
      checkoutProvider: provider,
      supabaseConfigured: Boolean(supabase),
      stripeMode,
      paddleEnv,
      message: statusMessage(row),
    },
    setCookies,
  }
}

export async function startCheckout(request: Request): Promise<{
  url: string
  provider: CheckoutProvider
  overlay: PaddleOverlay | null
  setCookies: string[]
}> {
  const supabase = readSupabaseConfig()
  const user = await currentUser(request)
  const setCookies: string[] = []
  let userId = user?.id ?? null
  const email = user?.email ?? null

  const denied = checkoutSignInError({
    supabaseConfigured: Boolean(supabase),
    hasUser: Boolean(userId),
  })
  if (denied) throw new Error(denied)

  if (!userId) {
    userId = localUserIdFrom(request)
    setCookies.push(localUserCookie(userId))
  }

  if (user && supabase) {
    const profile = await ensureOwnProfile(supabase, jwtFromRequest(request))
    if (profile?.pack_paid_at) {
      throw new Error("The RiteStack pack is already unlocked on this account.")
    }
  }

  const returnTo = await checkoutReturnPathFromRequest(request)
  const { provider } = checkoutProviderFromEnv()

  if (provider === "paddle") {
    const config = readPaddleConfig()
    const checkout = await createPaddleCheckout(config, { userId, email, returnTo })
    return { url: checkout.url, provider, overlay: checkout.overlay, setCookies }
  }

  if (provider === "stripe") {
    const config = readStripeConfig()
    const session = await stripeRequest(
      config,
      "POST",
      "/checkout/sessions",
      checkoutSessionFields({
        appUrl: config.appUrl,
        priceId: config.priceId,
        userId,
        email,
        returnTo,
      })
    )
    const url = checkedStripeCheckoutUrl(
      session && typeof session === "object" ? (session as { url?: unknown }).url : null
    )
    return { url, provider, overlay: null, setCookies }
  }

  throw new Error(
    "Checkout is not configured. Set Paddle secrets (PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, PADDLE_PRICE_ID, PADDLE_ENV) on the Worker."
  )
}

export async function retrievePaidCheckout(sessionId: string): Promise<PaidCheckout | null> {
  if (!sessionId.startsWith("cs_")) return null
  if (!stripeConfigured()) return null
  const config = readStripeConfig()
  const session = await stripeRequest(
    config,
    "GET",
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  )
  return paidCheckoutFromSession(session)
}

export async function persistPaid(paid: PaidCheckout): Promise<void> {
  const supabase = readSupabaseConfig()
  if (!supabase) return
  await markProfilePaid(supabase, {
    userId: paid.userId,
    sessionId: paid.sessionId,
    customerId: paid.customerId,
    paidAt: new Date().toISOString(),
  })
}

export async function applyPaidCheckout(paid: PaidCheckout): Promise<void> {
  await persistPaid(paid)
}

export function withCookies(response: Response, setCookies: string[]): Response {
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie)
  }
  return response
}

export { PACK_COOKIE }

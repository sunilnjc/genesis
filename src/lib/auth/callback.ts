/** Parse magic-link callback params and keep PKCE errors off the page. */

export const AUTH_ERROR_PATH = "/auth/error"

export const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const

export type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number]

export type AuthCallbackKind = "token_hash" | "pkce_code" | "provider_error" | "empty"

export type ParsedAuthCallback = {
  kind: AuthCallbackKind
  tokenHash: string | null
  type: EmailOtpType | null
  code: string | null
  error: string | null
  errorCode: string | null
}

export type AuthErrorReason = "pkce" | "otp" | "expired" | "missing" | "exchange" | "config"

const OTP_TYPE_SET = new Set<string>(EMAIL_OTP_TYPES)

export function otpTypeFromAction(emailActionType: string | null | undefined): EmailOtpType {
  const raw = (emailActionType ?? "").trim()
  if (raw === "email_change_new") return "email_change"
  if (OTP_TYPE_SET.has(raw)) return raw as EmailOtpType
  return "magiclink"
}

export function parseAuthCallbackSearch(search: string): ParsedAuthCallback {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const error = params.get("error_description") || params.get("error")
  const errorCode = params.get("error_code")
  const tokenHash = (params.get("token_hash") || params.get("token") || "").trim() || null
  const type = otpTypeFromAction(params.get("type"))
  const typePresent = Boolean((params.get("type") || "").trim())
  const code = (params.get("code") || "").trim() || null

  if (error) {
    return { kind: "provider_error", tokenHash, type: typePresent ? type : null, code, error, errorCode }
  }
  if (tokenHash) {
    return { kind: "token_hash", tokenHash, type, code, error: null, errorCode }
  }
  if (code) {
    return { kind: "pkce_code", tokenHash: null, type: typePresent ? type : null, code, error: null, errorCode }
  }
  return { kind: "empty", tokenHash: null, type: null, code: null, error: null, errorCode }
}

export function classifyAuthFailure(message: string | null | undefined): AuthErrorReason {
  const text = message ?? ""
  if (/pkce|code verifier/i.test(text)) return "pkce"
  if (/expired|otp_expired/i.test(text)) return "expired"
  if (/not configured/i.test(text)) return "config"
  if (/otp|token/i.test(text)) return "otp"
  return "exchange"
}

const FRIENDLY: Record<AuthErrorReason, string> = {
  pkce: "That sign-in link could not finish in this browser. Request a new link from RiteStack and open it — the mail app is fine.",
  otp: "That sign-in link is invalid. Request a new one from the app.",
  expired: "That sign-in link is invalid or has expired. Request a new one from the app.",
  missing: "This sign-in link is incomplete. Request a new one from the app.",
  exchange: "Could not finish sign-in. Request a new link from the app.",
  config: "RiteStack auth is not configured in this build.",
}

export function friendlyAuthError(reasonOrMessage: string | null | undefined): string {
  const raw = (reasonOrMessage ?? "").trim()
  const reason = (Object.keys(FRIENDLY) as AuthErrorReason[]).includes(raw as AuthErrorReason)
    ? (raw as AuthErrorReason)
    : classifyAuthFailure(raw)
  const message = FRIENDLY[reason]
  if (/pkce|code verifier/i.test(message)) {
    return FRIENDLY.exchange
  }
  return message
}

export function authErrorPath(reason: AuthErrorReason): string {
  return `${AUTH_ERROR_PATH}?reason=${reason}`
}

export function safeNextPath(next: string | null | undefined): string {
  const value = (next ?? "").trim() || "/"
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  return value
}

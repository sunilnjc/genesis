type AuthError = { code?: string; status?: number } | null
type OtpAuth = {
  signInWithOtp: (input: { email: string; options: { shouldCreateUser: boolean } }) => PromiseLike<{ error: AuthError }>
  verifyOtp: (input: { email: string; token: string; type: "email" }) => PromiseLike<{ error: AuthError }>
}

export function normalizeEmailCode(code: string): string {
  return code.replace(/\s/g, "")
}

export function validEmailCode(code: string): boolean {
  // Supabase supports configurable OTP lengths; production currently sends eight digits.
  return /^\d{6,10}$/.test(normalizeEmailCode(code))
}

export function emailCodeError(error: Exclude<AuthError, null>, verifying: boolean): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "Too many attempts. Please wait a minute before trying again."
  }
  if (verifying && (error.code === "otp_expired" || error.code === "otp_disabled" || error.status === 403)) {
    return "That code is invalid, expired, or already used. Enter the newest code or request a new one."
  }
  return verifying
    ? "Could not verify that code. Check the newest email and try again."
    : "Could not send a code. Please try again shortly."
}

export async function requestEmailCode(auth: OtpAuth | null, email: string) {
  if (!auth) return { error: "Sign-in is unavailable. Please try again shortly." }
  const address = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { error: "Enter a valid email address." }
  try {
    const { error } = await auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } })
    return { error: error ? emailCodeError(error, false) : null }
  } catch {
    return { error: "Could not reach sign-in. Check your connection and try again." }
  }
}

export async function verifyEmailCode(auth: OtpAuth | null, email: string, code: string) {
  if (!auth) return { error: "Sign-in is unavailable. Please try again shortly." }
  if (!validEmailCode(code)) return { error: "Enter the complete numeric code from your email." }
  try {
    const { error } = await auth.verifyOtp({ email: email.trim(), token: normalizeEmailCode(code), type: "email" })
    return { error: error ? emailCodeError(error, true) : null }
  } catch {
    return { error: "Could not reach sign-in. Check your connection and try again." }
  }
}

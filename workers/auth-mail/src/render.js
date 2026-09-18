export const FROM_EMAIL = "hello@ritestack.app"
export const FROM_NAME = "RiteStack"
export const RITESTACK_SUPABASE_REF = "gmbretmepjxrsmuxvpbn"
export const JOB_PURSUIT_SUPABASE_REF = "vhjwzxcgkmxvrmfstzpy"
export const DEFAULT_CALLBACK = "https://ritestack.app/auth/callback"
export const ALLOWED_CALLBACK_ORIGINS = new Set([
  "https://ritestack.app",
  "http://127.0.0.1:4317",
  "http://localhost:4317",
])

const SUBJECTS = {
  magiclink: "Your RiteStack sign-in code",
  signup: "Confirm your email for RiteStack",
  invite: "You've been invited to RiteStack",
  recovery: "Reset your RiteStack password",
  email_change: "Confirm your new email for RiteStack",
  email_change_new: "Confirm your new email for RiteStack",
  reauthentication: "Your RiteStack verification code",
}

const OTP_TYPES = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"])

export function otpTypeFromAction(emailActionType) {
  const raw = String(emailActionType || "").trim()
  if (raw === "email_change_new") return "email_change"
  if (OTP_TYPES.has(raw)) return raw
  return "magiclink"
}

export function callbackOriginUrl(redirectTo) {
  try {
    const parsed = new URL(String(redirectTo || DEFAULT_CALLBACK))
    if (!ALLOWED_CALLBACK_ORIGINS.has(parsed.origin)) return DEFAULT_CALLBACK
    return `${parsed.origin}/auth/callback`
  } catch {
    return DEFAULT_CALLBACK
  }
}

/**
 * Magic links land on ritestack.app with token_hash. The app calls verifyOtp.
 * Do not send users through supabase.co/auth/v1/verify (that issues a PKCE code).
 */
export function confirmationUrl(emailData, _supabaseUrl) {
  const url = new URL(callbackOriginUrl(emailData.redirect_to))
  url.searchParams.set("token_hash", emailData.token_hash)
  url.searchParams.set("type", otpTypeFromAction(emailData.email_action_type))
  return url.toString()
}

export function assertRiteStackRef(supabaseUrl) {
  const lower = String(supabaseUrl).toLowerCase()
  if (lower.includes(JOB_PURSUIT_SUPABASE_REF) || lower.includes("the-job-pursuit")) {
    throw new Error("Refusing Job Pursuit Supabase project.")
  }
  if (!lower.includes(RITESTACK_SUPABASE_REF)) {
    throw new Error("Auth mailer must use RiteStack project gmbretmepjxrsmuxvpbn.")
  }
}

export function fillTemplate(source, emailData, supabaseUrl) {
  const url = confirmationUrl(emailData, supabaseUrl)
  return source.replaceAll("{{ .Token }}", emailData.token || "").replaceAll("{{ .ConfirmationURL }}", url)
}

export function pickTemplateName(emailActionType) {
  if (emailActionType === "signup" || emailActionType === "invite" || emailActionType === "email_change" || emailActionType === "email_change_new") {
    return "confirm-sign-up.html"
  }
  return "sign-in.html"
}

export function subjectFor(emailActionType, token) {
  const subject = SUBJECTS[emailActionType] || SUBJECTS.magiclink
  return subject.replace("{{token}}", token || "").replace("{{ .Token }}", token || "")
}

export const FROM_EMAIL = "hello@ritestack.app"
export const FROM_NAME = "RiteStack"
export const RITESTACK_SUPABASE_REF = "gmbretmepjxrsmuxvpbn"
export const JOB_PURSUIT_SUPABASE_REF = "vhjwzxcgkmxvrmfstzpy"

const SUBJECTS = {
  magiclink: "Your RiteStack sign-in code",
  signup: "Confirm your email for RiteStack",
  invite: "You've been invited to RiteStack",
  recovery: "Reset your RiteStack password",
  email_change: "Confirm your new email for RiteStack",
  email_change_new: "Confirm your new email for RiteStack",
  reauthentication: "Your RiteStack verification code",
}

export function confirmationUrl(emailData, supabaseUrl) {
  const base = `${String(supabaseUrl).replace(/\/$/, "")}/auth/v1/verify`
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to || "https://ritestack.app/auth/callback",
  })
  return `${base}?${params.toString()}`
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

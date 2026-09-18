/** Job Pursuit project — never use this URL or ref in RiteStack. */
export const JOB_PURSUIT_SUPABASE_REF = "vhjwzxcgkmxvrmfstzpy"

const FORBIDDEN_REF_MARKERS = [JOB_PURSUIT_SUPABASE_REF, "the-job-pursuit"]

export function isBrowserLocalhost(hostname = typeof window === "undefined" ? "" : window.location.hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]"
  )
}

export function readPublicSupabaseEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "")
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim()
  return { url, anonKey }
}

export function assertNotJobPursuit(url: string) {
  const lower = url.toLowerCase()
  if (FORBIDDEN_REF_MARKERS.some((marker) => lower.includes(marker))) {
    throw new Error(
      "Refusing to use Job Pursuit’s Supabase project. RiteStack needs its own project."
    )
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = readPublicSupabaseEnv()
  if (!url || !anonKey) return false
  assertNotJobPursuit(url)
  return url.startsWith("https://") && url.includes(".supabase.co")
}

export function hostedRequiresLogin(hostname?: string) {
  return isSupabaseConfigured() && !isBrowserLocalhost(hostname)
}

/**
 * Where the subscription list may be read.
 * Hosted + configured: unsigned visitors never see localStorage or the founder seed.
 * Localhost without Supabase may keep the on-device founder notebook.
 */
export type SubscriptionListMode = "remote" | "local-founder" | "empty" | "login-required"

export function subscriptionListMode(input: {
  configured: boolean
  isLocalhost: boolean
  signedIn: boolean
}): SubscriptionListMode {
  if (input.configured && input.signedIn) return "remote"
  if (input.configured && !input.isLocalhost) return "login-required"
  if (input.configured) return "empty"
  if (input.isLocalhost) return "local-founder"
  return "login-required"
}

export const AUTH_CALLBACK_PATH = "/auth/callback"
export const AUTH_ERROR_PATH = "/auth/error"

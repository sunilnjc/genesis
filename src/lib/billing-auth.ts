const BEARER = /^Bearer\s+/i
const AUTH_TOKEN_COOKIE = /^sb-.+-auth-token(?:\.(\d+))?$/
const BASE64_PREFIX = "base64-"

/** Headers the billing API already accepts (`Authorization: Bearer <jwt>`). */
export function billingAuthHeaders(accessToken: string | null | undefined): Record<string, string> {
  if (!accessToken) return {}
  return { Authorization: `Bearer ${accessToken}` }
}

export function bearerFromAuthorization(header: string | null | undefined): string {
  if (!header || !BEARER.test(header)) return ""
  return header.replace(BEARER, "").trim()
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  return binary
}

function parseCookieHeader(header: string): Map<string, string> {
  const cookies = new Map<string, string>()
  for (const part of header.split(/;\s*/)) {
    if (!part) continue
    const eq = part.indexOf("=")
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    const raw = part.slice(eq + 1)
    try {
      cookies.set(name, decodeURIComponent(raw))
    } catch {
      cookies.set(name, raw)
    }
  }
  return cookies
}

function accessTokenFromEncodedSession(encoded: string): string {
  if (!encoded) return ""
  let json = encoded
  if (encoded.startsWith(BASE64_PREFIX)) {
    try {
      json = decodeBase64Url(encoded.slice(BASE64_PREFIX.length))
    } catch {
      return ""
    }
  }
  try {
    const parsed = JSON.parse(json) as { access_token?: unknown }
    return typeof parsed.access_token === "string" ? parsed.access_token : ""
  } catch {
    return encoded.split(".").length === 3 ? encoded : ""
  }
}

/**
 * Same `@supabase/ssr` cookie the hosted session already sends.
 * Chunked `sb-<ref>-auth-token.N` values are concatenated in order.
 */
export function accessTokenFromCookieHeader(cookieHeader: string): string {
  const cookies = parseCookieHeader(cookieHeader)
  const chunks: { index: number; value: string }[] = []
  let whole = ""

  for (const [name, value] of cookies) {
    const match = name.match(AUTH_TOKEN_COOKIE)
    if (!match) continue
    if (match[1] !== undefined) {
      chunks.push({ index: Number(match[1]), value })
    } else {
      whole = value
    }
  }

  const encoded = chunks.length
    ? chunks
        .sort((a, b) => a.index - b.index)
        .map((chunk) => chunk.value)
        .join("")
    : whole

  return accessTokenFromEncodedSession(encoded)
}

/** Bearer wins; otherwise the cookie session `/auth/callback` writes. */
export function jwtFromRequest(request: Request): string {
  return (
    bearerFromAuthorization(request.headers.get("authorization")) ||
    accessTokenFromCookieHeader(request.headers.get("cookie") ?? "")
  )
}

import { createChunks, stringToBase64URL } from "@supabase/ssr"

const BASE64_PREFIX = "base64-"

export type AuthCookieRecord = {
  name: string
  value: string
  domain: string
  path: "/"
  expires: -1
  httpOnly: false
  secure: boolean
  sameSite: "Lax"
}

/** Playwright storageState cookies (domain + path, not url). */
export function playwrightAuthCookies(
  origin: string,
  storageKey: string,
  session: unknown
): AuthCookieRecord[] {
  const encoded = `${BASE64_PREFIX}${stringToBase64URL(JSON.stringify(session))}`
  const chunks = createChunks(storageKey, encoded)
  const url = new URL(origin)
  return chunks.map((chunk) => ({
    name: chunk.name,
    value: chunk.value,
    domain: url.hostname,
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: url.protocol === "https:",
    sameSite: "Lax",
  }))
}


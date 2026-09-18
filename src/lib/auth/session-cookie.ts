import { createChunks, stringToBase64URL } from "@supabase/ssr"

const BASE64_PREFIX = "base64-"

export type AuthCookieRecord = {
  name: string
  value: string
  url: string
  httpOnly: false
  secure: boolean
  sameSite: "Lax"
  path: "/"
}

/** Same encoding @supabase/ssr createBrowserClient uses (base64url cookies). */
export function playwrightAuthCookies(origin: string, storageKey: string, session: unknown): AuthCookieRecord[] {
  const encoded = `${BASE64_PREFIX}${stringToBase64URL(JSON.stringify(session))}`
  const chunks = createChunks(storageKey, encoded)
  const url = new URL(origin)
  return chunks.map((chunk) => ({
    name: chunk.name,
    value: chunk.value,
    url: `${url.origin}/`,
    httpOnly: false,
    secure: url.protocol === "https:",
    sameSite: "Lax",
    path: "/",
  }))
}

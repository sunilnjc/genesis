function header(headers, name) {
  return headers.get(name) || headers.get(name.toLowerCase()) || headers.get(name.replace(/\b\w/g, (c) => c.toUpperCase()))
}

function decodeSecret(secret) {
  const trimmed = String(secret).trim()
  const raw = trimmed.replace(/^v1,whsec_/, "").replace(/^whsec_/, "")
  const binary = atob(raw)
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
}

async function hmacSha256(keyBytes, message) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  const bytes = new Uint8Array(sig)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function signaturesFrom(headerValue) {
  return String(headerValue)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^v1,/, "").replace(/^v1=/, ""))
}

export async function verifyStandardWebhook(payload, headers, secret) {
  const id = header(headers, "webhook-id")
  const timestamp = header(headers, "webhook-timestamp")
  const signatureHeader = header(headers, "webhook-signature")
  if (!id || !timestamp || !signatureHeader) {
    throw new Error("Missing Standard Webhooks headers.")
  }
  const expected = await hmacSha256(decodeSecret(secret), `${id}.${timestamp}.${payload}`)
  const matched = signaturesFrom(signatureHeader).some((candidate) => candidate === expected)
  if (!matched) {
    throw new Error("Invalid webhook signature.")
  }
  return JSON.parse(payload)
}

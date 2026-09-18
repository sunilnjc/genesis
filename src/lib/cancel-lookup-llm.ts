import type { SearchHit } from "./cancel-lookup-search.ts"

function envKey(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function llmKeyPresent(): boolean {
  return Boolean(envKey("OPENAI_API_KEY") || envKey("ANTHROPIC_API_KEY"))
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:") return null
    url.hash = ""
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1)
    }
    return url.href
  } catch {
    return null
  }
}

function allowlist(hits: SearchHit[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const hit of hits) {
    const key = normalizeUrl(hit.url)
    if (key) map.set(key, hit.url)
  }
  return map
}

function parseUrlFromModel(raw: string, allowed: Map<string, string>): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const url = (parsed as { url?: unknown }).url
  if (typeof url !== "string" && url !== null) return null
  if (url === null || !url.trim()) return null
  const key = normalizeUrl(url)
  if (!key) return null
  return allowed.get(key) ?? null
}

const EXTRACT_INSTRUCTIONS = `You extract the official cancel or manage-billing URL for a product.
Return JSON only: {"url": string | null}.
Copy a URL exactly from the provided search results. If none is the vendor's official billing/cancel/account page, return {"url": null}.
Never invent a URL. Never use Gmail, Plaid, or LinkedIn.`

async function openaiExtract(
  apiKey: string,
  name: string,
  hits: SearchHit[],
  allowed: Map<string, string>
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_INSTRUCTIONS },
        {
          role: "user",
          content: JSON.stringify({ name, results: hits.slice(0, 8) }),
        },
      ],
    }),
  })
  if (!response.ok) return null
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = body.choices?.[0]?.message?.content
  if (!content) return null
  return parseUrlFromModel(content, allowed)
}

async function anthropicExtract(
  apiKey: string,
  name: string,
  hits: SearchHit[],
  allowed: Map<string, string>
): Promise<string | null> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 200,
      temperature: 0,
      system: EXTRACT_INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ name, results: hits.slice(0, 8) }),
        },
      ],
    }),
  })
  if (!response.ok) return null
  const body = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }
  const text = body.content?.find((part) => part.type === "text")?.text
  if (!text) return null
  return parseUrlFromModel(text, allowed)
}

/**
 * Optional extraction. Only runs when OPENAI_API_KEY or ANTHROPIC_API_KEY is
 * already set. The model may only return a URL that appeared in search hits.
 */
export async function extractCancelUrlWithLlm(
  name: string,
  hits: SearchHit[]
): Promise<string | null> {
  if (hits.length === 0) return null
  const allowed = allowlist(hits)
  if (allowed.size === 0) return null

  const openai = envKey("OPENAI_API_KEY")
  if (openai) return openaiExtract(openai, name, hits, allowed)

  const anthropic = envKey("ANTHROPIC_API_KEY")
  if (anthropic) return anthropicExtract(anthropic, name, hits, allowed)

  return null
}

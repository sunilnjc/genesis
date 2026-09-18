export type SearchHit = {
  url: string
  title: string
  snippet: string
}

export type SearchCancelPages = (name: string) => Promise<SearchHit[]>

const SEARCH_TIMEOUT_MS = 8_000
const MIN_CONFIDENCE = 6

const BLOCKED_HOSTS = [
  "gmail.com",
  "googlemail.com",
  "mail.google.com",
  "plaid.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "medium.com",
  "quora.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "pinterest.com",
  "wikipedia.org",
  "duckduckgo.com",
  "google.com",
  "bing.com",
  "yahoo.com",
  "subreceipt.com",
  "nobill.app",
  "rocketmoney.com",
  "truebill.com",
]

const USER_AGENT =
  "RiteStack/0.1 (cancel-lookup; +https://ritestack.app)"

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase()
}

function hostIsBlocked(hostname: string): boolean {
  const host = normalizeHost(hostname)
  return BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

export function parseDuckDuckGoLite(html: string): SearchHit[] {
  const hits: SearchHit[] = []
  const seen = new Set<string>()
  const tagRe = /<a\b([^>]*class=['"]result-link['"][^>]*)>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(tagRe)) {
    const attrs = match[1] ?? ""
    const title = decodeEntities((match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    const hrefMatch = /href=['"]([^'"]+)['"]/i.exec(attrs)
    if (!hrefMatch) continue
    const href = decodeEntities(hrefMatch[1])
    let url: URL
    try {
      url = new URL(href)
    } catch {
      continue
    }
    if (url.protocol !== "https:") continue
    if (hostIsBlocked(url.hostname)) continue
    const key = url.href
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({ url: url.href, title, snippet: "" })
  }

  return hits
}

async function fetchLiteResults(name: string, fetchImpl: typeof fetch): Promise<SearchHit[]> {
  const query = `${name} official cancel subscription OR manage billing`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "text/html",
        "user-agent": USER_AGENT,
      },
      body: new URLSearchParams({ q: query }).toString(),
      signal: controller.signal,
      redirect: "follow",
    })
    if (!response.ok) return []
    const html = await response.text()
    return parseDuckDuckGoLite(html)
  } finally {
    clearTimeout(timer)
  }
}

export async function searchCancelPages(
  name: string,
  fetchImpl: typeof fetch = fetch
): Promise<SearchHit[]> {
  const query = name.trim()
  if (!query) return []
  try {
    return await fetchLiteResults(query, fetchImpl)
  } catch {
    return []
  }
}

function hostMatchesProduct(hostname: string, tokens: string[], brandSlug: string | null): boolean {
  const host = normalizeHost(hostname)
  if (brandSlug && brandSlug.length >= 3 && host.includes(brandSlug)) return true
  return tokens.some((token) => host.includes(token))
}

export function scoreCancelHit(
  hit: SearchHit,
  name: string,
  brandSlug: string | null
): number {
  let url: URL
  try {
    url = new URL(hit.url)
  } catch {
    return 0
  }
  if (url.protocol !== "https:") return 0
  if (hostIsBlocked(url.hostname)) return 0

  const tokens = nameTokens(name)
  if (!hostMatchesProduct(url.hostname, tokens, brandSlug)) return 0

  const host = normalizeHost(url.hostname)
  const path = url.pathname.toLowerCase()
  const search = url.search.toLowerCase()
  const text = `${hit.title} ${hit.snippet} ${path} ${search}`.toLowerCase()

  let score = 3
  if (
    host.startsWith("docs.") ||
    host.startsWith("dash.") ||
    host.startsWith("app.") ||
    host.startsWith("console.") ||
    host.startsWith("account.") ||
    host.startsWith("dashboard.")
  ) {
    score += 1
  }
  if (/\bbilling\b/.test(text)) score += 3
  if (/\b(subscription|subscribe)\b/.test(text)) score += 2
  if (/\bcancel/.test(text)) score += 2
  if (/\b(manage|account|dashboard|payments?)\b/.test(text)) score += 1
  if (host.startsWith("community.") || host.startsWith("answers.") || host.startsWith("forum.")) {
    score -= 2
  }
  if (path === "/" || path === "") score -= 2
  if (/\bhow to cancel\b/.test(hit.title.toLowerCase()) && !/\bbilling\b/.test(path)) {
    score -= 1
  }
  return score
}

/**
 * Pick a URL only when a first-party result clearly looks like billing /
 * subscription / cancel. Third-party “how to cancel” pages never qualify.
 */
export function pickConfidentCancelUrl(
  name: string,
  hits: SearchHit[],
  brandSlug: string | null = null
): string | null {
  let bestUrl: string | null = null
  let bestScore = MIN_CONFIDENCE - 1
  let bestIndex = Number.POSITIVE_INFINITY
  for (let index = 0; index < hits.length; index += 1) {
    const hit = hits[index]
    const score = scoreCancelHit(hit, name, brandSlug)
    if (score < MIN_CONFIDENCE) continue
    if (score > bestScore || (score === bestScore && index < bestIndex)) {
      bestUrl = hit.url
      bestScore = score
      bestIndex = index
    }
  }
  return bestUrl
}

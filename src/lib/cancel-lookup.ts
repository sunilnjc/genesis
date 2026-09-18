import { catalogCancelUrl, matchBrand } from "./brand-catalog.ts"
import { extractCancelUrlWithLlm, llmKeyPresent } from "./cancel-lookup-llm.ts"
import {
  pickConfidentCancelUrl,
  searchCancelPages,
  type SearchCancelPages,
} from "./cancel-lookup-search.ts"

export { catalogCancelUrl } from "./brand-catalog.ts"

export type CancelLookupSource = "catalog" | "lookup" | null

export type CancelLookupResult = {
  url: string | null
  source: CancelLookupSource
}

export type CancelLookupDeps = {
  search?: SearchCancelPages
  llmExtract?: typeof extractCancelUrlWithLlm
  hasLlmKey?: () => boolean
}

function canonicalize(value: string): string | null {
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

function urlFromHits(candidate: string, hits: { url: string }[]): string | null {
  const key = canonicalize(candidate)
  if (!key) return null
  for (const hit of hits) {
    if (canonicalize(hit.url) === key) return hit.url
  }
  return null
}

/**
 * Resolve an official cancel / manage-billing URL for the name the customer
 * typed or selected. Catalog first (`catalogCancelUrl` from brand-catalog);
 * otherwise a background-capable web lookup. Never invents a URL.
 */
export async function lookupCancelUrl(
  name: string,
  deps: CancelLookupDeps = {}
): Promise<CancelLookupResult> {
  const query = name.trim()
  if (!query) return { url: null, source: null }

  const catalogUrl = catalogCancelUrl(query)
  if (catalogUrl) return { url: catalogUrl, source: "catalog" }

  const brand = matchBrand(query)
  const search = deps.search ?? searchCancelPages
  let hits
  try {
    hits = await search(query)
  } catch {
    return { url: null, source: null }
  }

  const hasLlmKey = deps.hasLlmKey ?? llmKeyPresent
  if (hasLlmKey()) {
    const llmExtract = deps.llmExtract ?? extractCancelUrlWithLlm
    try {
      const llmUrl = await llmExtract(query, hits)
      const allowed = llmUrl ? urlFromHits(llmUrl, hits) : null
      if (allowed) return { url: allowed, source: "lookup" }
    } catch {
      // Fall through to structured scoring. Never invent a URL from a failed model.
    }
  }

  const ranked = pickConfidentCancelUrl(query, hits, brand?.slug ?? null)
  if (!ranked) return { url: null, source: null }
  return { url: ranked, source: "lookup" }
}

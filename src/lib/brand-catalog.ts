export type Brand = {
  slug: string
  title: string
  src: string
  /** Simple Icons hex, or official product hex when SI has no slug. */
  hex: string
  /**
   * Official SI/product marks that are black (or near-black) sit on a light
   * plate so the real glyph reads on charcoal — not a white/currentColor fill.
   */
  plate?: boolean
  aliases: string[]
}

function isDarkHex(hex: string): boolean {
  const value = hex.replace("#", "")
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.18
}

function brand(
  slug: string,
  title: string,
  hex: string,
  aliases: string[]
): Brand {
  return {
    slug,
    title,
    src: `/brands/${slug}.svg`,
    hex,
    plate: isDarkHex(hex),
    aliases,
  }
}

/**
 * Local Simple Icons SVGs (CC0) painted with each brand’s SI hex, plus a
 * CoinGecko gecko (no SI slug) in the mascot green/yellow. No logo CDN at runtime.
 */
export const BRAND_CATALOG: Brand[] = [
  brand("openai", "OpenAI", "412991", ["openai", "chatgpt", "gpt"]),
  brand("claude", "Claude", "D97757", ["claude"]),
  brand("anthropic", "Anthropic", "191919", ["anthropic"]),
  brand("cursor", "Cursor", "000000", ["cursor"]),
  brand("cloudflare", "Cloudflare", "F38020", ["cloudflare"]),
  brand("cloudflareworkers", "Cloudflare Workers", "F38020", ["cloudflare workers"]),
  brand("x", "X", "000000", ["x", "twitter"]),
  {
    slug: "coingecko",
    title: "CoinGecko",
    src: "/brands/coingecko.svg",
    hex: "40C000",
    aliases: ["coingecko"],
  },
  brand("github", "GitHub", "181717", ["github", "copilot"]),
  brand("notion", "Notion", "000000", ["notion"]),
  brand("figma", "Figma", "F24E1E", ["figma"]),
  brand("linear", "Linear", "5E6AD2", ["linear"]),
  brand("vercel", "Vercel", "000000", ["vercel"]),
  brand("railway", "Railway", "0B0D0E", ["railway"]),
  brand("grammarly", "Grammarly", "027E6F", ["grammarly"]),
  brand("supabase", "Supabase", "3FCF8E", ["supabase"]),
  brand("resend", "Resend", "000000", ["resend"]),
  brand("perplexity", "Perplexity", "1FB8CD", ["perplexity"]),
  {
    slug: "gemini",
    title: "Gemini",
    src: "/brands/googlegemini.svg",
    hex: "8E75B2",
    aliases: ["gemini", "google gemini"],
  },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function matchBrand(name: string): Brand | null {
  const key = normalize(name)
  if (!key) return null

  const ranked = BRAND_CATALOG.flatMap((entry) => {
    const hit = entry.aliases.some((alias) => {
      const token = normalize(alias)
      if (!token) return false
      if (token === "x") {
        return key === "x" || key.startsWith("x ") || key.includes("twitter")
      }
      return (
        key === token ||
        key.startsWith(`${token} `) ||
        key.includes(` ${token} `) ||
        key.endsWith(` ${token}`)
      )
    })
    return hit ? [entry] : []
  })

  if (ranked.length === 0) return null
  if (key.includes("twitter") || key === "x" || key.startsWith("x ")) {
    return ranked.find((entry) => entry.slug === "x") ?? ranked[0]
  }
  if (key.includes("claude")) return ranked.find((entry) => entry.slug === "claude") ?? ranked[0]
  if (key.includes("workers")) {
    return ranked.find((entry) => entry.slug === "cloudflareworkers") ?? ranked[0]
  }
  return ranked[0]
}

export function brandInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const letter = trimmed.replace(/[^A-Za-z0-9]/g, "").charAt(0)
  return (letter || trimmed.charAt(0)).toUpperCase()
}

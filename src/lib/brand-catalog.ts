export type Brand = {
  slug: string
  title: string
  src: string
  aliases: string[]
}

/**
 * Local Simple Icons SVGs (CC0), plus a CoinGecko gecko mark vendored for the
 * founder’s stack (Simple Icons has no CoinGecko slug). No logo CDN at runtime.
 */
export const BRAND_CATALOG: Brand[] = [
  { slug: "openai", title: "OpenAI", src: "/brands/openai.svg", aliases: ["openai", "chatgpt", "gpt"] },
  { slug: "claude", title: "Claude", src: "/brands/claude.svg", aliases: ["claude"] },
  { slug: "anthropic", title: "Anthropic", src: "/brands/anthropic.svg", aliases: ["anthropic"] },
  { slug: "cursor", title: "Cursor", src: "/brands/cursor.svg", aliases: ["cursor"] },
  { slug: "cloudflare", title: "Cloudflare", src: "/brands/cloudflare.svg", aliases: ["cloudflare"] },
  { slug: "x", title: "X", src: "/brands/x.svg", aliases: ["x", "twitter"] },
  { slug: "coingecko", title: "CoinGecko", src: "/brands/coingecko.svg", aliases: ["coingecko"] },
  { slug: "github", title: "GitHub", src: "/brands/github.svg", aliases: ["github", "copilot"] },
  { slug: "notion", title: "Notion", src: "/brands/notion.svg", aliases: ["notion"] },
  { slug: "figma", title: "Figma", src: "/brands/figma.svg", aliases: ["figma"] },
  { slug: "linear", title: "Linear", src: "/brands/linear.svg", aliases: ["linear"] },
  { slug: "vercel", title: "Vercel", src: "/brands/vercel.svg", aliases: ["vercel"] },
  { slug: "railway", title: "Railway", src: "/brands/railway.svg", aliases: ["railway"] },
  { slug: "grammarly", title: "Grammarly", src: "/brands/grammarly.svg", aliases: ["grammarly"] },
  { slug: "supabase", title: "Supabase", src: "/brands/supabase.svg", aliases: ["supabase"] },
  { slug: "resend", title: "Resend", src: "/brands/resend.svg", aliases: ["resend"] },
  { slug: "perplexity", title: "Perplexity", src: "/brands/perplexity.svg", aliases: ["perplexity"] },
  { slug: "gemini", title: "Gemini", src: "/brands/googlegemini.svg", aliases: ["gemini", "google gemini"] },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function matchBrand(name: string): Brand | null {
  const key = normalize(name)
  if (!key) return null

  const ranked = BRAND_CATALOG.flatMap((brand) => {
    const hit = brand.aliases.some((alias) => {
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
    return hit ? [brand] : []
  })

  if (ranked.length === 0) return null
  if (key.includes("twitter") || key === "x" || key.startsWith("x ")) {
    return ranked.find((brand) => brand.slug === "x") ?? ranked[0]
  }
  if (key.includes("claude")) return ranked.find((brand) => brand.slug === "claude") ?? ranked[0]
  return ranked[0]
}

export function brandInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const letter = trimmed.replace(/[^A-Za-z0-9]/g, "").charAt(0)
  return (letter || trimmed.charAt(0)).toUpperCase()
}

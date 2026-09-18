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
  /**
   * Official manage-billing / cancel page for this product. Omitted when the
   * vendor has no stable public URL we can cite.
   */
  cancelUrl?: string
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
  aliases: string[],
  cancelUrl?: string
): Brand {
  return {
    slug,
    title,
    src: `/brands/${slug}.svg`,
    hex,
    plate: isDarkHex(hex),
    aliases,
    ...(cancelUrl ? { cancelUrl } : {}),
  }
}

/**
 * Local Simple Icons SVGs (CC0) painted with each brand’s SI hex, plus a
 * CoinGecko gecko (no SI slug) in the mascot green/yellow. No logo CDN at runtime.
 *
 * `cancelUrl` values are official vendor billing/cancel pages only — never guessed.
 */
export const BRAND_CATALOG: Brand[] = [
  brand(
    "openai",
    "OpenAI",
    "412991",
    ["openai", "chatgpt", "gpt"],
    "https://chatgpt.com/account/manage"
  ),
  brand(
    "claude",
    "Claude",
    "D97757",
    ["claude"],
    "https://claude.ai/settings/billing"
  ),
  brand(
    "anthropic",
    "Anthropic",
    "191919",
    ["anthropic"],
    "https://console.anthropic.com/settings/billing"
  ),
  brand(
    "cursor",
    "Cursor",
    "000000",
    ["cursor"],
    "https://cursor.com/dashboard/billing"
  ),
  brand(
    "cloudflare",
    "Cloudflare",
    "F38020",
    ["cloudflare"],
    "https://dash.cloudflare.com/?to=/:account/billing"
  ),
  brand(
    "cloudflareworkers",
    "Cloudflare Workers",
    "F38020",
    ["cloudflare workers"],
    "https://dash.cloudflare.com/?to=/:account/billing"
  ),
  brand("x", "X", "000000", ["x", "twitter"], "https://x.com/settings/subscription"),
  {
    slug: "coingecko",
    title: "CoinGecko",
    src: "/brands/coingecko.svg",
    hex: "40C000",
    aliases: ["coingecko"],
    cancelUrl: "https://www.coingecko.com/en/developers/dashboard",
  },
  brand(
    "github",
    "GitHub",
    "181717",
    ["github", "copilot"],
    "https://github.com/settings/billing"
  ),
  brand(
    "notion",
    "Notion",
    "000000",
    ["notion"],
    "https://www.notion.so/my-account"
  ),
  brand(
    "figma",
    "Figma",
    "F24E1E",
    ["figma"],
    "https://www.figma.com/settings"
  ),
  brand(
    "linear",
    "Linear",
    "5E6AD2",
    ["linear"],
    "https://linear.app/settings/billing"
  ),
  brand(
    "vercel",
    "Vercel",
    "000000",
    ["vercel"],
    "https://vercel.com/account/billing"
  ),
  brand(
    "netlify",
    "Netlify",
    "00C7B7",
    ["netlify"],
    "https://app.netlify.com/user/billing"
  ),
  brand(
    "flydotio",
    "Fly.io",
    "24175B",
    ["fly", "fly.io", "flyio"],
    "https://fly.io/dashboard/personal/billing"
  ),
  brand(
    "railway",
    "Railway",
    "0B0D0E",
    ["railway"],
    "https://railway.com/workspace/billing"
  ),
  brand(
    "grammarly",
    "Grammarly",
    "027E6F",
    ["grammarly"],
    "https://account.grammarly.com/subscription"
  ),
  brand(
    "supabase",
    "Supabase",
    "3FCF8E",
    ["supabase"],
    "https://supabase.com/dashboard/org/_/billing"
  ),
  brand(
    "resend",
    "Resend",
    "000000",
    ["resend"],
    "https://resend.com/settings/billing"
  ),
  brand(
    "perplexity",
    "Perplexity",
    "1FB8CD",
    ["perplexity"],
    "https://www.perplexity.ai/account/details"
  ),
  {
    slug: "gemini",
    title: "Gemini",
    src: "/brands/googlegemini.svg",
    hex: "8E75B2",
    aliases: ["gemini", "google gemini"],
    cancelUrl: "https://one.google.com/settings",
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

/** Official cancel / manage-billing URL for a typed tool name, if we have one. */
export function catalogCancelUrl(name: string): string | null {
  return matchBrand(name)?.cancelUrl ?? null
}

export function brandInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const letter = trimmed.replace(/[^A-Za-z0-9]/g, "").charAt(0)
  return (letter || trimmed.charAt(0)).toUpperCase()
}

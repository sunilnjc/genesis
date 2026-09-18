import { firstOfNextMonth } from "@/lib/dates"
import { newId } from "@/lib/ritual"
import type { Subscription } from "@/lib/types"

/** Bump when the founder-confirmed set or official cancel URLs change. */
export const FOUNDER_SEED_VERSION = 5

export const FOUNDER_TOOLS = [
  {
    name: "OpenAI Pro+",
    monthlyCost: 200,
    category: "AI" as const,
    cancelUrl: "https://chatgpt.com/account/manage",
  },
  {
    name: "Cursor Pro",
    monthlyCost: 20,
    category: "AI" as const,
    cancelUrl: "https://cursor.com/dashboard/billing",
  },
  {
    name: "Claude",
    monthlyCost: 20,
    category: "AI" as const,
    cancelUrl: "https://claude.ai/settings/billing",
  },
  {
    name: "Cloudflare workers",
    monthlyCost: 10,
    category: "Hosting" as const,
    cancelUrl: "https://dash.cloudflare.com/?to=/:account/billing",
  },
  {
    name: "Twitter (X)",
    monthlyCost: 95,
    category: "Other" as const,
    cancelUrl: "https://x.com/settings/subscription",
  },
  {
    name: "CoinGecko",
    monthlyCost: 100,
    category: "Other" as const,
    cancelUrl: "https://www.coingecko.com/en/developers/dashboard",
  },
] as const

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

export function isFounderToolName(name: string): boolean {
  const key = normalizeName(name)
  if (FOUNDER_TOOLS.some((tool) => normalizeName(tool.name) === key)) return true
  if (key === "openai pro+" || key === "chatgpt pro" || key === "chatgpt pro+") return true
  if (key === "claude pro" || key === "anthropic claude") return true
  if (key.startsWith("cloudflare")) return true
  if (key === "x" || key === "twitter" || key === "x premium" || key === "twitter x") return true
  if (key.startsWith("coingecko")) return true
  return false
}

export function founderStack(now = new Date()): Subscription[] {
  const renewDate = firstOfNextMonth(now)
  const stamp = now.toISOString()

  return FOUNDER_TOOLS.map((tool) => ({
    id: newId(),
    name: tool.name,
    monthlyCost: tool.monthlyCost,
    renewDate,
    category: tool.category,
    cancelUrl: tool.cancelUrl,
    lastUsed: null,
    decision: "undecided" as const,
    remindAt: null,
    isSample: false,
    cutAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  }))
}

import { addDays, todayISO } from "@/lib/dates"
import { newId } from "@/lib/ritual"
import type { Subscription } from "@/lib/types"

export function sampleStack(now = new Date()): Subscription[] {
  const today = todayISO(now)
  const stamp = now.toISOString()

  const rows: Array<
    Pick<
      Subscription,
      "name" | "monthlyCost" | "category" | "cancelUrl" | "lastUsed"
    > & { renewOffset: number }
  > = [
    {
      name: "Cursor Pro",
      monthlyCost: 20,
      category: "AI",
      cancelUrl: "https://cursor.com/dashboard",
      lastUsed: today,
      renewOffset: 8,
    },
    {
      name: "ChatGPT Plus",
      monthlyCost: 20,
      category: "AI",
      cancelUrl: "https://chatgpt.com/#settings",
      lastUsed: addDays(today, -2),
      renewOffset: 21,
    },
    {
      name: "Vercel Pro",
      monthlyCost: 20,
      category: "Hosting",
      cancelUrl: "https://vercel.com/account/billing",
      lastUsed: null,
      renewOffset: 5,
    },
    {
      name: "Notion",
      monthlyCost: 10,
      category: "Productivity",
      cancelUrl: "https://www.notion.so/my-account",
      lastUsed: addDays(today, -45),
      renewOffset: 12,
    },
    {
      name: "Figma Professional",
      monthlyCost: 15,
      category: "Design",
      cancelUrl: "https://www.figma.com/settings",
      lastUsed: null,
      renewOffset: 40,
    },
    {
      name: "Linear",
      monthlyCost: 8,
      category: "Dev tools",
      cancelUrl: "https://linear.app/settings/billing",
      lastUsed: addDays(today, -6),
      renewOffset: 18,
    },
    {
      name: "Railway",
      monthlyCost: 5,
      category: "Hosting",
      cancelUrl: "https://railway.com/account/billing",
      lastUsed: null,
      renewOffset: 3,
    },
    {
      name: "Porkbun domain",
      monthlyCost: 1.17,
      category: "Domains",
      cancelUrl: "https://porkbun.com/account/domains",
      lastUsed: null,
      renewOffset: 62,
    },
  ]

  return rows.map((row) => ({
    id: newId(),
    name: row.name,
    monthlyCost: row.monthlyCost,
    renewDate: addDays(today, row.renewOffset),
    category: row.category,
    cancelUrl: row.cancelUrl,
    lastUsed: row.lastUsed,
    decision: "undecided",
    remindAt: null,
    isSample: true,
    cutAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  }))
}

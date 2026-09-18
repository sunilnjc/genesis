export const CATEGORIES = [
  "AI",
  "Dev tools",
  "Hosting",
  "Design",
  "Productivity",
  "Domains",
  "Other",
] as const

export type Category = (typeof CATEGORIES)[number]

export const DECISIONS = ["undecided", "keep", "cut", "pause"] as const
export type Decision = (typeof DECISIONS)[number]

export type QueueReason =
  | "renewing-soon"
  | "renew-passed"
  | "last-used-unknown"
  | "last-used-stale"
  | "paused-due"

export type Subscription = {
  id: string
  name: string
  monthlyCost: number
  renewDate: string
  category: Category
  cancelUrl: string
  lastUsed: string | null
  decision: Decision
  remindAt: string | null
  isSample: boolean
  cutAt: string | null
  createdAt: string
  updatedAt: string
}

export type GraveyardStore = {
  version: 1
  subscriptions: Subscription[]
}

export type SubscriptionDraft = {
  name: string
  monthlyCost: string
  renewDate: string
  category: Category
  cancelUrl: string
  lastUsedUnknown: boolean
  lastUsed: string
}

export type FormErrors = Partial<Record<keyof SubscriptionDraft, string>> & {
  form?: string
}

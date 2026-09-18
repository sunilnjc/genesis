import type { Category, Decision, Subscription } from "@/lib/types"

export type SubscriptionRow = {
  id: string
  user_id: string
  name: string
  monthly_cost: number | string
  renew_date: string
  category: string
  cancel_url: string
  last_used: string | null
  decision: string
  remind_at: string | null
  is_sample: boolean
  cut_at: string | null
  created_at: string
  updated_at: string
}

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    monthlyCost: typeof row.monthly_cost === "number" ? row.monthly_cost : Number(row.monthly_cost),
    renewDate: row.renew_date,
    category: row.category as Category,
    cancelUrl: row.cancel_url ?? "",
    lastUsed: row.last_used,
    decision: row.decision as Decision,
    remindAt: row.remind_at,
    isSample: row.is_sample,
    cutAt: row.cut_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toSubscriptionRow(row: Subscription, userId: string): SubscriptionRow {
  if (!userId) {
    throw new Error("Refusing to write subscriptions without user_id / auth.uid().")
  }
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    monthly_cost: row.monthlyCost,
    renew_date: row.renewDate,
    category: row.category,
    cancel_url: row.cancelUrl,
    last_used: row.lastUsed,
    decision: row.decision,
    remind_at: row.remindAt,
    is_sample: row.isSample,
    cut_at: row.cutAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

import type { SupabaseClient } from "@supabase/supabase-js"
import { toSubscription, toSubscriptionRow } from "@/lib/subscriptions/map"
import type { GraveyardStore, Subscription } from "@/lib/types"

export async function fetchSubscriptions(
  client: SupabaseClient,
  userId: string
): Promise<Subscription[]> {
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSubscription)
}

export async function persistSubscriptions(
  client: SupabaseClient,
  userId: string,
  subscriptions: Subscription[]
): Promise<void> {
  if (!userId) throw new Error("Missing user_id — will not write rows.")

  const { data: existing, error: existingError } = await client
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
  if (existingError) throw new Error(existingError.message)

  const keep = new Set(subscriptions.map((row) => row.id))
  const stale = (existing ?? []).map((row) => row.id).filter((id) => !keep.has(id))
  if (stale.length > 0) {
    const { error } = await client.from("subscriptions").delete().in("id", stale).eq("user_id", userId)
    if (error) throw new Error(error.message)
  }

  if (subscriptions.length === 0) return

  const payload = subscriptions.map((row) => toSubscriptionRow(row, userId))
  const { error } = await client.from("subscriptions").upsert(payload, { onConflict: "id" })
  if (error) throw new Error(error.message)
}

export async function clearRemoteSubscriptions(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.from("subscriptions").delete().eq("user_id", userId)
  if (error) throw new Error(error.message)
}

export function remoteStore(subscriptions: Subscription[]): GraveyardStore {
  return { version: 1, subscriptions }
}

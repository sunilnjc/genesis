import type { GraveyardStore, Subscription } from "@/lib/types"

export const STORAGE_KEY = "subscription-graveyard.v1"

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "StorageError"
    this.cause = options?.cause
  }
}

function isSubscription(value: unknown): value is Subscription {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<Subscription>
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.monthlyCost === "number" &&
    Number.isFinite(row.monthlyCost) &&
    typeof row.renewDate === "string" &&
    typeof row.category === "string" &&
    typeof row.cancelUrl === "string" &&
    (row.lastUsed === null || typeof row.lastUsed === "string") &&
    typeof row.decision === "string" &&
    (row.remindAt === null || typeof row.remindAt === "string") &&
    typeof row.isSample === "boolean" &&
    (row.cutAt === null || typeof row.cutAt === "string") &&
    typeof row.createdAt === "string" &&
    typeof row.updatedAt === "string"
  )
}

export function emptyStore(): GraveyardStore {
  return { version: 1, subscriptions: [] }
}

export function loadStore(): GraveyardStore {
  if (typeof window === "undefined") return emptyStore()

  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch (cause) {
    throw new StorageError(
      "This browser blocked localStorage, so nothing can be saved here.",
      { cause }
    )
  }

  if (!raw) return emptyStore()

  try {
    const parsed = JSON.parse(raw) as Partial<GraveyardStore>
    if (parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) {
      throw new Error("unexpected shape")
    }
    if (!parsed.subscriptions.every(isSubscription)) {
      throw new Error("invalid row")
    }
    return {
      version: 1,
      subscriptions: parsed.subscriptions,
    }
  } catch (cause) {
    throw new StorageError(
      "Saved subscriptions look corrupted. You can start a fresh list without losing the app.",
      { cause }
    )
  }
}

export function saveStore(store: GraveyardStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (cause) {
    throw new StorageError(
      "Could not save. The list is still on this screen — fix the row and try again.",
      { cause }
    )
  }
}

export function clearStore(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

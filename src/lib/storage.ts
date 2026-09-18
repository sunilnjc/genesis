import {
  FOUNDER_SEED_VERSION,
  FOUNDER_TOOLS,
  founderStack,
  isFounderToolName,
} from "@/lib/founder-stack"
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
  return { version: 1, seedVersion: FOUNDER_SEED_VERSION, subscriptions: [] }
}

const EMPTY_STORE: GraveyardStore = {
  version: 1,
  seedVersion: FOUNDER_SEED_VERSION,
  subscriptions: [],
}

export function getEmptyStoreSnapshot(): GraveyardStore {
  return EMPTY_STORE
}

export function seededStore(now = new Date()): GraveyardStore {
  return {
    version: 1,
    seedVersion: FOUNDER_SEED_VERSION,
    subscriptions: founderStack(now),
  }
}

function mergeFounderRows(existing: Subscription[], now = new Date()): Subscription[] {
  const founder = founderStack(now)
  const real = existing.filter((row) => !row.isSample)
  const extras = real.filter((row) => !isFounderToolName(row.name))

  const merged = founder.map((next) => {
    const prev = real.find((row) => isFounderToolName(row.name) && namesAlign(row.name, next.name))
    if (!prev) return next
    return {
      ...prev,
      name: next.name,
      monthlyCost: next.monthlyCost,
      category: next.category,
      cancelUrl: next.cancelUrl,
      lastUsed: prev.lastUsed,
      isSample: false,
      updatedAt: now.toISOString(),
    }
  })

  return [...merged, ...extras]
}

function namesAlign(existing: string, founderName: string): boolean {
  const key = existing.trim().toLowerCase()
  if (founderName === "OpenAI Pro+") return /openai|chatgpt pro/i.test(existing)
  if (founderName === "Cursor Pro") return /cursor/i.test(existing)
  if (founderName === "Claude") return /claude/i.test(existing)
  if (founderName === "Cloudflare workers") return /cloudflare/i.test(existing)
  if (founderName === "Twitter (X)") {
    return /twitter|\bx premium\b|\bx pro\b/i.test(existing) || key === "x"
  }
  if (founderName === "CoinGecko") return /coingecko/i.test(existing)
  return key === founderName.trim().toLowerCase()
}

export function applyFounderSeed(store: GraveyardStore): GraveyardStore {
  const currentVersion = store.seedVersion ?? 0
  const hasAllFounder =
    currentVersion >= FOUNDER_SEED_VERSION &&
    FOUNDER_TOOLS.every((tool) =>
      store.subscriptions.some(
        (row) => !row.isSample && namesAlign(row.name, tool.name)
      )
    )

  if (hasAllFounder) return store

  return {
    version: 1,
    seedVersion: FOUNDER_SEED_VERSION,
    subscriptions: mergeFounderRows(store.subscriptions),
  }
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

  if (!raw) {
    const seeded = seededStore()
    try {
      saveStore(seeded)
    } catch {
      /* still return seeded so the first paint isn’t empty */
    }
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GraveyardStore>
    if (parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) {
      throw new Error("unexpected shape")
    }
    const existing = parsed.subscriptions
    if (!existing.every(isSubscription)) {
      throw new Error("invalid row")
    }
    const next = applyFounderSeed({
      version: 1,
      seedVersion: parsed.seedVersion,
      subscriptions: existing,
    })
    if (
      next.seedVersion !== parsed.seedVersion ||
      next.subscriptions.length !== existing.length ||
      next.subscriptions.some(
        (row, index) =>
          row.id !== existing[index]?.id ||
          row.monthlyCost !== existing[index]?.monthlyCost ||
          row.isSample !== existing[index]?.isSample
      )
    ) {
      try {
        saveStore(next)
      } catch {
        /* keep the in-memory seed even if persist fails */
      }
    }
    return next
  } catch (cause) {
    if (cause instanceof StorageError) throw cause
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

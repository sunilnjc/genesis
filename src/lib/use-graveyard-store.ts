"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  clearStore,
  emptyStore,
  getEmptyStoreSnapshot,
  loadStore,
  saveStore,
  StorageError,
} from "@/lib/storage"
import { FOUNDER_SEED_VERSION } from "@/lib/founder-stack"
import type { GraveyardStore, Subscription } from "@/lib/types"

type Snapshot =
  | { status: "ok"; store: GraveyardStore }
  | { status: "error"; message: string }

let snapshot: Snapshot | null = null
const listeners = new Set<() => void>()

function readSnapshot(): Snapshot {
  if (snapshot) return snapshot
  try {
    snapshot = { status: "ok", store: loadStore() }
  } catch (error) {
    snapshot = {
      status: "error",
      message:
        error instanceof StorageError
          ? error.message
          : "Could not read saved subscriptions.",
    }
  }
  return snapshot
}

function emit() {
  snapshot = null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const SERVER_SNAPSHOT: Snapshot = {
  status: "ok",
  store: getEmptyStoreSnapshot(),
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT
}

export function useGraveyardStore() {
  const current = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot)

  const replace = useCallback((subscriptions: Subscription[]) => {
    const seedVersion =
      snapshot?.status === "ok"
        ? snapshot.store.seedVersion ?? FOUNDER_SEED_VERSION
        : FOUNDER_SEED_VERSION
    const next: GraveyardStore = { version: 1, seedVersion, subscriptions }
    saveStore(next)
    snapshot = { status: "ok", store: next }
    emit()
  }, [])

  const reset = useCallback(() => {
    clearStore()
    snapshot = { status: "ok", store: emptyStore() }
    emit()
  }, [])

  return { current, replace, reset }
}

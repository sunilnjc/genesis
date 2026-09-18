"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  clearStore,
  emptyStore,
  loadStore,
  saveStore,
  StorageError,
} from "@/lib/storage"
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

function getServerSnapshot(): Snapshot {
  return { status: "ok", store: emptyStore() }
}

export function useGraveyardStore() {
  const current = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot)

  const replace = useCallback((subscriptions: Subscription[]) => {
    const next: GraveyardStore = { version: 1, subscriptions }
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

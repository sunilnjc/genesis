"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import {
  clearStore,
  emptyStore,
  getEmptyStoreSnapshot,
  loadStore,
  saveStore,
  StorageError,
} from "@/lib/storage"
import { FOUNDER_SEED_VERSION } from "@/lib/founder-stack"
import {
  clearRemoteSubscriptions,
  fetchSubscriptions,
  persistSubscriptions,
  remoteStore,
} from "@/lib/subscriptions/remote"
import type { GraveyardStore, Subscription } from "@/lib/types"

type Snapshot =
  | { status: "ok"; store: GraveyardStore }
  | { status: "error"; message: string }
  | { status: "loading" }

function localErrorMessage(error: unknown) {
  return error instanceof StorageError
    ? error.message
    : "Could not read saved subscriptions."
}

export function useGraveyardStore() {
  const auth = useAuth()
  const remote = Boolean(auth.supabase && auth.userId && auth.status === "signed-in")
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (auth.status === "loading") {
        setSnapshot({ status: "loading" })
        return
      }

      if (remote && auth.supabase && auth.userId) {
        try {
          const subscriptions = await fetchSubscriptions(auth.supabase, auth.userId)
          if (!cancelled) {
            setSnapshot({ status: "ok", store: remoteStore(subscriptions) })
          }
        } catch (error) {
          if (!cancelled) {
            setSnapshot({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Could not load subscriptions from RiteStack’s database.",
            })
          }
        }
        return
      }

      // Hosted signed-out is gated before this hook’s UI. Localhost keeps localStorage + founder seed.
      try {
        const store = loadStore({ seedFounder: auth.isLocalhost })
        if (!cancelled) setSnapshot({ status: "ok", store })
      } catch (error) {
        if (!cancelled) {
          setSnapshot({ status: "error", message: localErrorMessage(error) })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [auth.isLocalhost, auth.status, auth.supabase, auth.userId, remote])

  const replace = useCallback(
    async (subscriptions: Subscription[]) => {
      if (remote && auth.supabase && auth.userId) {
        const next = remoteStore(subscriptions)
        await persistSubscriptions(auth.supabase, auth.userId, subscriptions)
        setSnapshot({ status: "ok", store: next })
        return
      }

      const seedVersion =
        snapshot.status === "ok"
          ? snapshot.store.seedVersion ?? FOUNDER_SEED_VERSION
          : FOUNDER_SEED_VERSION
      const next: GraveyardStore = { version: 1, seedVersion, subscriptions }
      saveStore(next)
      setSnapshot({ status: "ok", store: next })
    },
    [auth.supabase, auth.userId, remote, snapshot]
  )

  const reset = useCallback(async () => {
    if (remote && auth.supabase && auth.userId) {
      await clearRemoteSubscriptions(auth.supabase, auth.userId)
      setSnapshot({ status: "ok", store: remoteStore([]) })
      return
    }
    clearStore()
    setSnapshot({ status: "ok", store: emptyStore() })
  }, [auth.supabase, auth.userId, remote])

  return {
    current:
      snapshot.status === "loading"
        ? { status: "ok" as const, store: getEmptyStoreSnapshot() }
        : snapshot.status === "ok"
          ? snapshot
          : snapshot,
    loading: snapshot.status === "loading" || auth.status === "loading",
    replace,
    reset,
    remote,
  }
}

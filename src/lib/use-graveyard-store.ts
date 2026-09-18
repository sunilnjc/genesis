"use client"

import { useCallback, useEffect, useState } from "react"
import { subscriptionListMode, useAuth } from "@/lib/auth"
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
  const signedIn = auth.status === "signed-in"
  const listMode = subscriptionListMode({
    configured: auth.configured,
    isLocalhost: auth.isLocalhost,
    signedIn,
  })
  const remote = listMode === "remote" && Boolean(auth.supabase && auth.userId)
  const canMutate = listMode === "remote" || listMode === "local-founder"
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (auth.status === "loading") {
        setSnapshot({ status: "loading" })
        return
      }

      if (listMode === "remote" && auth.supabase && auth.userId) {
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

      if (listMode === "local-founder") {
        try {
          const store = loadStore({ seedFounder: true })
          if (!cancelled) setSnapshot({ status: "ok", store })
        } catch (error) {
          if (!cancelled) {
            setSnapshot({ status: "error", message: localErrorMessage(error) })
          }
        }
        return
      }

      // Configured but unsigned, or hosted without a session: never localStorage / founder seed.
      if (!cancelled) setSnapshot({ status: "ok", store: emptyStore() })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [auth.status, auth.supabase, auth.userId, listMode])

  const replace = useCallback(
    async (subscriptions: Subscription[]) => {
      if (!canMutate) {
        throw new StorageError("Sign in to add or change tools. This URL is not a shared notebook.")
      }
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
    [auth.supabase, auth.userId, canMutate, remote, snapshot]
  )

  const reset = useCallback(async () => {
    if (!canMutate) {
      setSnapshot({ status: "ok", store: emptyStore() })
      return
    }
    if (remote && auth.supabase && auth.userId) {
      await clearRemoteSubscriptions(auth.supabase, auth.userId)
      setSnapshot({ status: "ok", store: remoteStore([]) })
      return
    }
    clearStore()
    setSnapshot({ status: "ok", store: emptyStore() })
  }, [auth.supabase, auth.userId, canMutate, remote])

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
    canMutate,
    listMode,
  }
}

"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { AUTH_CALLBACK_PATH, hostedRequiresLogin, isBrowserLocalhost, isSupabaseConfigured } from "@/lib/auth/config"
import { cacheAuth } from "@/lib/auth/session"
import type { RiteStackAuth } from "@/lib/auth/types"
import { getBrowserSupabase } from "@/lib/supabase/client"

const AuthContext = createContext<RiteStackAuth | null>(null)

function redirectTo() {
  if (typeof window === "undefined") return undefined
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const isLocalhost = typeof window === "undefined" ? true : isBrowserLocalhost()
  const requiresLogin = typeof window === "undefined" ? false : hostedRequiresLogin()
  const supabase = configured ? getBrowserSupabase() : null

  const [status, setStatus] = useState<RiteStackAuth["status"]>(configured ? "loading" : "local-only")
  const [session, setSession] = useState<RiteStackAuth["session"]>(null)
  const [user, setUser] = useState<RiteStackAuth["user"]>(null)

  useEffect(() => {
    if (!configured || !supabase) {
      cacheAuth(null, null)
      setStatus("local-only")
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const nextSession = data.session ?? null
      const nextUser = nextSession?.user ?? null
      cacheAuth(nextSession, nextUser)
      setSession(nextSession)
      setUser(nextUser)
      setStatus(nextUser ? "signed-in" : "signed-out")
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null
      cacheAuth(nextSession, nextUser)
      setSession(nextSession)
      setUser(nextUser)
      setStatus(nextUser ? "signed-in" : "signed-out")
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [configured, supabase])

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      if (!supabase) return { error: "Supabase is not configured for this build." }
      const trimmed = email.trim()
      if (!trimmed || !trimmed.includes("@")) return { error: "Enter a real email address." }
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo(),
          shouldCreateUser: true,
        },
      })
      return { error: error?.message ?? null }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    if (!supabase) {
      cacheAuth(null, null)
      setSession(null)
      setUser(null)
      setStatus(configured ? "signed-out" : "local-only")
      return
    }
    await supabase.auth.signOut()
    cacheAuth(null, null)
    setSession(null)
    setUser(null)
    setStatus("signed-out")
  }, [configured, supabase])

  const value = useMemo<RiteStackAuth>(
    () => ({
      status,
      userId: user?.id ?? session?.user?.id ?? null,
      session,
      user,
      email: user?.email ?? session?.user?.email ?? null,
      requiresLogin,
      isLocalhost,
      configured,
      supabase,
      signInWithMagicLink,
      signOut,
    }),
    [configured, isLocalhost, requiresLogin, session, signInWithMagicLink, signOut, status, supabase, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): RiteStackAuth {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuth() must run inside <AuthProvider>. Other agents: wrap the tree from src/app/page.tsx.")
  }
  return value
}

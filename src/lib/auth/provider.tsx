"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { isBrowserLocalhost, isSupabaseConfigured } from "@/lib/auth/config"
import { requestEmailCode, verifyEmailCode } from "@/lib/auth/email-otp"
import { cacheAuth } from "@/lib/auth/session"
import type { RiteStackAuth } from "@/lib/auth/types"
import { getBrowserSupabase } from "@/lib/supabase/client"

const AuthContext = createContext<RiteStackAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  // Secure default on SSR: never treat the server as localhost or the hosted
  // HTML will paint the founder notebook before the client hydrates.
  const isLocalhost = typeof window === "undefined" ? false : isBrowserLocalhost()
  const requiresLogin = configured && !isLocalhost
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

  const requestSignInCode = useCallback(
    (email: string) => requestEmailCode(supabase?.auth ?? null, email),
    [supabase]
  )
  const verifySignInCode = useCallback(
    (email: string, code: string) => verifyEmailCode(supabase?.auth ?? null, email, code),
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
      requestSignInCode,
      verifySignInCode,
      signOut,
    }),
    [configured, isLocalhost, requiresLogin, session, requestSignInCode, verifySignInCode, signOut, status, supabase, user]
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

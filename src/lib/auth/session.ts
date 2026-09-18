import type { Session, User } from "@supabase/supabase-js"

let currentSession: Session | null = null
let currentUser: User | null = null

/** Module cache other agents can read from event handlers (not during SSR). */
export function getSession(): Session | null {
  return currentSession
}

export function getUserId(): string | null {
  return currentUser?.id ?? currentSession?.user?.id ?? null
}

export function getUser(): User | null {
  return currentUser
}

export function cacheAuth(session: Session | null, user: User | null) {
  currentSession = session
  currentUser = user ?? session?.user ?? null
}

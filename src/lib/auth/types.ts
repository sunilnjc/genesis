import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "local-only"

/**
 * Shared auth surface for other RiteStack agents (Stripe, UX worktrees).
 * Prefer `userId` + `session` over rolling your own client.
 */
export type RiteStackAuth = {
  status: AuthStatus
  /** `auth.uid()` when signed in; null otherwise. */
  userId: string | null
  session: Session | null
  user: User | null
  email: string | null
  /** Hosted + configured: the shell must not render until signed in. */
  requiresLogin: boolean
  /** True on localhost/127.0.0.1 — localStorage founder seed is allowed. */
  isLocalhost: boolean
  configured: boolean
  supabase: SupabaseClient | null
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export function getSessionUserId(session: Session | null | undefined): string | null {
  return session?.user?.id ?? null
}

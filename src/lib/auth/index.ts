/**
 * Auth hooks for other RiteStack agents opening PRs into sunilnjc/genesis.
 *
 * ```ts
 * const { userId, session, user, status, supabase } = useAuth()
 * // or outside React:
 * import { getUserId, getSession } from "@/lib/auth"
 * ```
 *
 * `user_id` on `subscriptions` must equal `userId` / `auth.uid()`.
 * Never ship `service_role` to the browser.
 */
export { AuthProvider, useAuth } from "@/lib/auth/provider"
export { getSession, getUser, getUserId } from "@/lib/auth/session"
export { getSessionUserId, type AuthStatus, type RiteStackAuth } from "@/lib/auth/types"
export {
  AUTH_CALLBACK_PATH,
  AUTH_ERROR_PATH,
  hostedRequiresLogin,
  isBrowserLocalhost,
  isSupabaseConfigured,
  JOB_PURSUIT_SUPABASE_REF,
  subscriptionListMode,
  type SubscriptionListMode,
} from "@/lib/auth/config"
export {
  authErrorPath,
  classifyAuthFailure,
  friendlyAuthError,
  parseAuthCallbackSearch,
  type AuthErrorReason,
  type ParsedAuthCallback,
} from "@/lib/auth/callback"

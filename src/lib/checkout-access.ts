export const CHECKOUT_SIGN_IN_ERROR = "Sign in to buy the RiteStack pack."

/** Hosted accounts (Supabase) must be signed in. Localhost without Auth can still buy. */
export function checkoutSignInError(input: {
  supabaseConfigured: boolean
  hasUser: boolean
}): string | null {
  if (input.supabaseConfigured && !input.hasUser) return CHECKOUT_SIGN_IN_ERROR
  return null
}

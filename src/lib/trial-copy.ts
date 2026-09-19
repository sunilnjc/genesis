import type { EntitlementState } from "./entitlement"

/** Locked weekend pricing — site, mail, and X must say the same thing. */

export const TRIAL_PACK_COPY =
  "7 days full ritual after sign-in. Then $14 once. Looking at your stack stays free."

/**
 * Signed-in Decide/Inventory reuse the unpaid §7 line only during trial.
 * Remaining-days is trial-only. Paid empty must not promise 7 days.
 */
export function showSignedInTrialPackCopy(state: EntitlementState): boolean {
  return state === "trial"
}

export function remainingTrialLabel(daysLeft: number | null | undefined): string | null {
  if (daysLeft == null || daysLeft <= 0) return null
  return daysLeft === 1 ? "1 day left" : `${daysLeft} days left`
}

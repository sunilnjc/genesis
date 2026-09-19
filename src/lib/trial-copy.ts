/** Locked weekend pricing — site, mail, and X must say the same thing. */

export const TRIAL_PACK_COPY =
  "7 days full ritual after sign-in. Then $14 once. Looking at your stack stays free."

export function remainingTrialLabel(daysLeft: number | null | undefined): string | null {
  if (daysLeft == null || daysLeft <= 0) return null
  return daysLeft === 1 ? "1 day left" : `${daysLeft} days left`
}

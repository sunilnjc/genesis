/** 7-day full ritual after signup, then a $14 one-time pack. Viewing the list stays free. */

export const TRIAL_DAYS = 7
export const PACK_AMOUNT_CENTS = 1400
export const PACK_AMOUNT_DOLLARS = 14
export const PACK_SKU = "ritestack_pack"
export const PACK_NAME = "RiteStack pack"

export type EntitlementState = "local" | "trial" | "paid" | "paywall"

export type Entitlement = {
  /** Inventory list, add/edit/delete, burn. Always true. */
  viewList: true
  /** Keep / cut / pause, cancel URLs, pause reminders. */
  ritual: boolean
  state: EntitlementState
  trialEndsAt: string | null
  packPaidAt: string | null
  daysLeft: number | null
  checkoutEnabled: boolean
}

export type EntitlementInput = {
  now?: Date
  hasSession: boolean
  trialEndsAt: string | null
  packPaidAt: string | null
  checkoutEnabled?: boolean
}

export function addTrialDays(from: Date, days = TRIAL_DAYS): Date {
  const next = new Date(from.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function daysLeftInTrial(trialEndsAt: string, now = new Date()): number {
  const end = Date.parse(trialEndsAt)
  if (!Number.isFinite(end)) return 0
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000))
}

export function entitlement(input: EntitlementInput): Entitlement {
  const now = input.now ?? new Date()
  const checkoutEnabled = input.checkoutEnabled === true
  const paidAt = input.packPaidAt

  if (paidAt) {
    return {
      viewList: true,
      ritual: true,
      state: "paid",
      trialEndsAt: input.trialEndsAt,
      packPaidAt: paidAt,
      daysLeft: null,
      checkoutEnabled: false,
    }
  }

  if (!input.hasSession) {
    return {
      viewList: true,
      ritual: true,
      state: "local",
      trialEndsAt: null,
      packPaidAt: null,
      daysLeft: null,
      checkoutEnabled,
    }
  }

  if (input.trialEndsAt && Date.parse(input.trialEndsAt) > now.getTime()) {
    return {
      viewList: true,
      ritual: true,
      state: "trial",
      trialEndsAt: input.trialEndsAt,
      packPaidAt: null,
      daysLeft: daysLeftInTrial(input.trialEndsAt, now),
      checkoutEnabled,
    }
  }

  return {
    viewList: true,
    ritual: false,
    state: "paywall",
    trialEndsAt: input.trialEndsAt,
    packPaidAt: null,
    daysLeft: 0,
    checkoutEnabled,
  }
}

/** $14 Checkout is allowed during trial. Only paid accounts are blocked. */
export function canStartPackCheckout(input: {
  state: EntitlementState
  checkoutEnabled: boolean
}): boolean {
  return input.checkoutEnabled && input.state !== "paid"
}

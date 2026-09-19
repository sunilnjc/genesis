import { daysBetween } from "./dates.ts"
import type { QueueReason, Subscription } from "./types.ts"

export const RENEW_SOON_DAYS = 14
export const LAST_USED_STALE_DAYS = 30
export const PAUSE_REMIND_DAYS = 30

export function isActive(sub: Subscription): boolean {
  return sub.decision !== "cut"
}

export function monthlyBurn(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(isActive)
    .reduce((sum, sub) => sum + sub.monthlyCost, 0)
}

export function cutThisPass(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((sub) => sub.decision === "cut")
    .reduce((sum, sub) => sum + sub.monthlyCost, 0)
}

export function queueReasons(sub: Subscription, today: string): QueueReason[] {
  if (sub.decision === "cut") return []

  const reasons: QueueReason[] = []
  const daysToRenew = daysBetween(today, sub.renewDate)

  if (daysToRenew < 0) reasons.push("renew-passed")
  else if (daysToRenew <= RENEW_SOON_DAYS) reasons.push("renewing-soon")

  if (sub.lastUsed == null) reasons.push("last-used-unknown")
  else if (daysBetween(sub.lastUsed, today) >= LAST_USED_STALE_DAYS) {
    reasons.push("last-used-stale")
  }

  if (
    sub.decision === "pause" &&
    sub.remindAt &&
    daysBetween(today, sub.remindAt) <= 0
  ) {
    reasons.push("paused-due")
  }

  if (sub.decision === "keep") {
    return reasons.filter(
      (reason) => reason === "renewing-soon" || reason === "renew-passed"
    )
  }

  if (sub.decision === "pause" && !reasons.includes("paused-due")) {
    return []
  }

  return reasons
}

export function inDecideByQueue(sub: Subscription, today: string): boolean {
  if (sub.decision === "cut") return false
  if (sub.decision === "undecided") return true
  return queueReasons(sub, today).length > 0
}

export function decideByQueue(
  subscriptions: Subscription[],
  today: string
): Subscription[] {
  return subscriptions
    .filter((sub) => inDecideByQueue(sub, today))
    .sort((a, b) => {
      const aRenew = daysBetween(today, a.renewDate)
      const bRenew = daysBetween(today, b.renewDate)
      return aRenew - bRenew
    })
}

export function reasonLabel(reason: QueueReason): string {
  switch (reason) {
    case "renewing-soon":
      return "Renewing soon"
    case "renew-passed":
      return "Renew date passed"
    case "last-used-unknown":
      return "Last-used unknown"
    case "last-used-stale":
      return "Last-used stale"
    case "paused-due":
      return "Pause is due"
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Send a paused tool back to Decide as undecided. Does not invent last-used. */
export function unpauseSubscription(sub: Subscription, now: string): Subscription {
  return {
    ...sub,
    decision: "undecided",
    remindAt: null,
    updatedAt: now,
  }
}

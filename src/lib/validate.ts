import { isValidISODate } from "@/lib/dates"
import { CATEGORIES, type FormErrors, type SubscriptionDraft } from "@/lib/types"

export function emptyDraft(today: string): SubscriptionDraft {
  return {
    name: "",
    monthlyCost: "",
    renewDate: today,
    category: "AI",
    cancelUrl: "",
    lastUsedUnknown: true,
    lastUsed: "",
  }
}

export function validateDraft(draft: SubscriptionDraft): FormErrors {
  const errors: FormErrors = {}
  const name = draft.name.trim()

  if (!name) errors.name = "Name the tool. Cursor, ChatGPT, the domain — whatever you actually pay for."
  else if (name.length > 80) errors.name = "Keep the name under 80 characters."

  const cost = Number(draft.monthlyCost)
  if (draft.monthlyCost.trim() === "") {
    errors.monthlyCost = "Enter the monthly amount you actually pay."
  } else if (!Number.isFinite(cost) || cost < 0) {
    errors.monthlyCost = "Monthly cost has to be a number, 0 or more."
  } else if (cost > 10_000) {
    errors.monthlyCost = "That number looks like a yearly invoice. Enter the monthly amount."
  }

  if (!draft.renewDate) errors.renewDate = "Set the next renew date. That’s the decide-by."
  else if (!isValidISODate(draft.renewDate)) {
    errors.renewDate = "Use a real calendar date."
  }

  if (!CATEGORIES.includes(draft.category)) {
    errors.category = "Pick a category."
  }

  const url = draft.cancelUrl.trim()
  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.cancelUrl = "Cancel URL needs to start with https://"
      }
    } catch {
      errors.cancelUrl = "That cancel URL isn’t a valid link. Paste the billing page."
    }
  }

  if (!draft.lastUsedUnknown) {
    if (!draft.lastUsed) {
      errors.lastUsed = "Set a last-used date, or mark it unknown. Don’t guess."
    } else if (!isValidISODate(draft.lastUsed)) {
      errors.lastUsed = "Use a real calendar date."
    }
  }

  return errors
}

export function parseCost(value: string): number {
  return Math.round(Number(value) * 100) / 100
}

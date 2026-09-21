import type { Subscription } from "./types.ts"

/** Undated legacy cuts stay undated; editing a receipt must not invent its cut date. */
export function cutReceipts(rows: Subscription[]): Subscription[] {
  return rows.filter((row) => row.decision === "cut").sort((a, b) =>
    (b.cutAt ?? "").localeCompare(a.cutAt ?? "") || b.createdAt.localeCompare(a.createdAt)
  )
}

export function receiptCancelUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}

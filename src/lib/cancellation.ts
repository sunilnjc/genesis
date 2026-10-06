import { addDays, isValidISODate, todayISO } from "./dates.ts"
import type { Subscription } from "./types.ts"

export function cancellationPending(row: Subscription): boolean {
  return row.decision === "cut" && !row.cancellationConfirmedAt
}

export function confirmCancellation(row: Subscription, date: string, note: string, today: string): Subscription {
  if (row.decision !== "cut") throw new Error("Choose Cut before confirming cancellation.")
  if (!isValidISODate(date) || date > today) {
    throw new Error("Choose a valid confirmation date on or before today.")
  }
  if (note.length > 500) throw new Error("Keep the note under 500 characters.")
  return { ...row, cancellationConfirmedAt: date, cancellationNote: note.trim() }
}

function escapeCalendar(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,")
}

/** Calendar notification at 9am local time, three days before renewal (or today). */
export function cancellationCalendar(row: Subscription, today: string, now = new Date()): string {
  if (!cancellationPending(row)) throw new Error("Only pending cancellations need a reminder.")
  const date = addDays(row.renewDate, -3) < today ? today : addDays(row.renewDate, -3)
  const soon = new Date(now.getTime() + 15 * 60 * 1000)
  const start = date === today
    ? `${todayISO(soon).replace(/-/g, "")}T${String(soon.getHours()).padStart(2, "0")}${String(soon.getMinutes()).padStart(2, "0")}00`
    : `${date.replace(/-/g, "")}T090000`
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RiteStack//Cancellation reminder//EN", "BEGIN:VEVENT",
    `UID:${escapeCalendar(row.id)}-${row.renewDate}@ritestack.app`, `DTSTAMP:${stamp}`,
    `DTSTART:${start}`, "DURATION:PT15M",
    `SUMMARY:${escapeCalendar(`Confirm cancellation: ${row.name}`)}`,
    `DESCRIPTION:${escapeCalendar(`You decided to cancel ${row.name}. Confirm with the provider before renewal on ${row.renewDate}. Review https://ritestack.app/cuts. Remove this calendar reminder after confirming cancellation in RiteStack.`)}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0S", "DESCRIPTION:Confirm cancellation before renewal", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"]
  // Fold UTF-8 safely below the iCalendar 75-octet line limit.
  return lines.map(line => { let result = "", length = 0; for (const char of line) {
    const bytes = new TextEncoder().encode(char).length
    if (length + bytes > 73) { result += "\r\n "; length = 1 }
    result += char; length += bytes
  } return result }).join("\r\n") + "\r\n"
}

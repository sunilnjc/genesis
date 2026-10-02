export const CURRENCY_DIGITS = {
  USD: 2,
  AED: 2,
  EUR: 2,
  GBP: 2,
  INR: 2,
  JPY: 0,
  KWD: 3,
} as const;
export type Currency = keyof typeof CURRENCY_DIGITS;
export function minorUnits(value: string, currency: Currency): number {
  const digits = CURRENCY_DIGITS[currency];
  if (
    digits === undefined ||
    !new RegExp(`^\\d+(?:\\.\\d{1,${Math.max(digits, 1)}})?$`).test(value) ||
    (digits === 0 && value.includes("."))
  )
    throw Error("Enter an amount with the correct currency precision.");
  const [whole, fraction = ""] = value.split(".");
  const minor =
    BigInt(whole) * BigInt(10) ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (minor > BigInt(9000000000000))
    throw Error("Amount exceeds supported range.");
  return Number(minor);
}
export function money(minor: number, currency: Currency): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    minor / 10 ** CURRENCY_DIGITS[currency],
  );
}
export function decimalAmount(minor: number, currency: Currency): string {
  return (minor / 10 ** CURRENCY_DIGITS[currency]).toFixed(
    CURRENCY_DIGITS[currency],
  );
}
export function calendarToday(timezone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}

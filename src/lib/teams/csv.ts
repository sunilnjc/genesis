import { CURRENCY_DIGITS, minorUnits, type Currency } from "./domain.ts";
export const CSV_COLUMNS = [
  "name",
  "owner_email",
  "amount",
  "currency",
  "interval_months",
  "seats",
  "renewal_date",
  "cancellation_deadline",
];
export type ImportRow = {
  name: string;
  owner_id: string | null;
  amount_minor: number;
  currency: Currency;
  interval_months: number;
  seats: number;
  renewal_date: string;
  cancellation_deadline: string | null;
};
export function parseCsv(text: string): string[][] {
  if (text.length > 15000) throw Error("Import up to 15 KB at a time.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
      continue;
    }
    if (c === '"' && !field && !closed) {
      quoted = true;
      continue;
    }
    if (c === "," || c === "\n" || c === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else {
      if (closed || c === '"') throw Error("Invalid CSV quoting.");
      field += c;
    }
  }
  if (quoted) throw Error("A quoted CSV field is not closed.");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  if (rows.length > 101) throw Error("Import up to 100 rows at a time.");
  return rows;
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function previewImport(
  text: string,
  members: { user_id: string; display_name: string }[],
  existing: { name: string; currency: string; renewal_date: string }[],
) {
  const [header, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!header || header.join(",") !== CSV_COLUMNS.join(","))
    throw Error("Use the exact template column headers.");
  const seen = new Set(
    existing.map(
      (r) => `${r.name.trim().toLowerCase()}|${r.currency}|${r.renewal_date}`,
    ),
  );
  return rows.map((values, index) => {
    try {
      if (values.length !== CSV_COLUMNS.length)
        throw Error("Incorrect number of columns.");
      const d = Object.fromEntries(
        CSV_COLUMNS.map((key, i) => [key, values[i].trim()]),
      );
      if (!d.name || d.name.length > 120)
        throw Error("Tool name must contain 1–120 characters.");
      if (!(d.currency in CURRENCY_DIGITS))
        throw Error("Unsupported currency.");
      if (!["1", "3", "6", "12"].includes(d.interval_months))
        throw Error("Billing interval must be 1, 3, 6, or 12 months.");
      if (!/^\d+$/.test(d.seats) || +d.seats < 1 || +d.seats > 100000)
        throw Error("Seats must be between 1 and 100000.");
      if (
        !validDate(d.renewal_date) ||
        (d.cancellation_deadline && !validDate(d.cancellation_deadline))
      )
        throw Error("Use valid YYYY-MM-DD dates.");
      const member = members.find(
        (m) => m.display_name.toLowerCase() === d.owner_email.toLowerCase(),
      );
      if (d.owner_email && !member)
        throw Error("Owner must already be an active workspace member.");
      const row: ImportRow = {
        name: d.name,
        owner_id: member?.user_id ?? null,
        amount_minor: minorUnits(d.amount, d.currency as Currency),
        currency: d.currency as Currency,
        interval_months: +d.interval_months,
        seats: +d.seats,
        renewal_date: d.renewal_date,
        cancellation_deadline: d.cancellation_deadline || null,
      };
      const duplicate = `${d.name.toLowerCase()}|${d.currency}|${d.renewal_date}`;
      if (seen.has(duplicate))
        throw Error(
          "Duplicate tool, currency and renewal date in this import or inventory.",
        );
      seen.add(duplicate);
      return { line: index + 2, row, error: null };
    } catch (e) {
      return { line: index + 2, row: null, error: (e as Error).message };
    }
  });
}
export function exportCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map(
          (value) =>
            '"' +
            (/^[\s]*[=+@\-]/.test(value) ? "'" + value : value).replaceAll(
              '"',
              '""',
            ) +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}

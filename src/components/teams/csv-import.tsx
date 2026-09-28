"use client";
import { useState } from "react";
import {
  CSV_COLUMNS,
  previewImport,
  exportCsv,
  type ImportRow,
} from "@/lib/teams/csv";
import { decimalAmount, type Currency } from "@/lib/teams/domain";
type Tool = {
  name: string;
  owner_id: string | null;
  amount_minor: number;
  currency: Currency;
  interval_months: number;
  seats: number;
  renewal_date: string;
  cancellation_deadline: string | null;
};
function download(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "ritestack-team-inventory.csv";
  a.click();
  URL.revokeObjectURL(url);
}
export function CsvImport({
  members,
  tools,
  busy,
  onImport,
}: {
  members: { user_id: string; display_name: string }[];
  tools: Tool[];
  busy: boolean;
  onImport: (rows: ImportRow[], key: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(CSV_COLUMNS.join(",") + "\n");
  const [preview, setPreview] = useState<ReturnType<typeof previewImport>>([]);
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  return (
    <details className="rounded-xl border border-white/20 p-4">
      <summary className="cursor-pointer">Import or export CSV</summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-white/60">
          Preview up to 100 tools. Owners must already be members. All rows must
          be valid; the import is saved together.
        </p>
        <label className="grid gap-2 text-sm">
          Paste CSV
          <textarea
            className="min-h-36 w-full rounded border border-white/20 bg-black/20 p-3 font-mono text-xs"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview([]);
              setKey("");
            }}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <button
            disabled={busy}
            onClick={() => {
              try {
                setPreview(previewImport(text, members, tools));
                setError("");
                setKey(crypto.randomUUID());
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Preview import
          </button>
          <button
            onClick={() =>
              download(
                exportCsv([
                  CSV_COLUMNS,
                  ...tools.map((t) => [
                    t.name,
                    members.find((m) => m.user_id === t.owner_id)
                      ?.display_name ?? "",
                    decimalAmount(t.amount_minor, t.currency),
                    t.currency,
                    String(t.interval_months),
                    String(t.seats),
                    t.renewal_date,
                    t.cancellation_deadline ?? "",
                  ]),
                ]),
              )
            }
          >
            Export inventory
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        {preview.map((row) => (
          <p key={row.line} className="text-sm">
            Row {row.line}: {row.error ?? `${row.row?.name} — ready`}
          </p>
        ))}
        {!!preview.length && !preview.some((row) => row.error) && (
          <button
            className="rounded bg-amber-200 px-4 py-2 text-black disabled:opacity-40"
            disabled={busy}
            onClick={async () => {
              if (
                await onImport(
                  preview.map((r) => r.row!),
                  key,
                )
              ) {
                setPreview([]);
                setText(CSV_COLUMNS.join(",") + "\n");
                setKey("");
              }
            }}
          >
            Import {preview.length} tools
          </button>
        )}
      </div>
    </details>
  );
}

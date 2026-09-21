import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ToolMark } from "@/components/tool-mark"
import { cutReceipts, receiptCancelUrl } from "@/lib/cuts"
import { formatDate, formatMoney } from "@/lib/dates"
import type { Subscription } from "@/lib/types"

export function CutsSection({ rows }: { rows: Subscription[] }) {
  const cuts = cutReceipts(rows)
  return (
    <section className="space-y-3" data-list="cuts" aria-label="Cut receipts">
      {cuts.length === 0 ? (
        <Empty className="border border-dashed py-16">
          <EmptyHeader>
            <EmptyTitle>Nothing cut yet.</EmptyTitle>
            <EmptyDescription>When you cut, it lands here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Cutting records your decision. Use the cancel URL to finish cancellation with the provider.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {cuts.map((row) => {
              const cancelUrl = receiptCancelUrl(row.cancelUrl)
              return (
                <Card key={row.id} size="sm" data-cut-id={row.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <ToolMark name={row.name} size="md" />
                        <span className="break-words">{row.name}</span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">{formatMoney(row.monthlyCost)}<span className="text-xs text-muted-foreground">/mo</span></span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {row.cutAt ? <>Cut <time dateTime={row.cutAt}>{formatDate(row.cutAt)}</time></> : "Cut date not recorded"}
                      {row.isSample ? <Badge variant="outline" className="ml-2">Sample</Badge> : null}
                    </span>
                    {cancelUrl ? (
                      <a href={cancelUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" aria-label={`Cancel URL for ${row.name}`}>Cancel URL</a>
                    ) : <span className="text-muted-foreground">No cancel URL</span>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

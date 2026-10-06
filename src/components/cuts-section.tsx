"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ToolMark } from "@/components/tool-mark"
import { cutReceipts, receiptCancelUrl } from "@/lib/cuts"
import { cancellationCalendar, cancellationPending, confirmCancellation } from "@/lib/cancellation"
import { formatDate, formatMoney, formatRelativeDay } from "@/lib/dates"
import type { Subscription } from "@/lib/types"

type Update = (id: string, patch: Partial<Subscription>) => Promise<boolean>

export function CutsSection({ rows, today, onUpdate, onEdit }: {
  rows: Subscription[]; today: string; onUpdate: Update; onEdit: (row: Subscription) => void
}) {
  const cuts = cutReceipts(rows)
  const pending = cuts.filter(cancellationPending).sort((a, b) => a.renewDate.localeCompare(b.renewDate))
  const confirmed = cuts.filter(row => !cancellationPending(row))
  return (
    <section className="space-y-4" data-list="cuts" aria-label="Cancellation tracking">
      <p className="text-sm text-muted-foreground">Cut records your decision, not a completed cancellation. Pending cuts stay in monthly burn and renewal reminders until you confirm with the provider.</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Card><CardContent className="pt-4">Pending cancellations <strong className="block text-xl">{pending.length}</strong><span className="text-muted-foreground">{formatMoney(pending.reduce((sum, row) => sum + row.monthlyCost, 0))}/mo still at risk</span></CardContent></Card>
        <Card><CardContent className="pt-4">Estimated monthly savings <strong className="block text-xl">{formatMoney(confirmed.reduce((sum, row) => sum + row.monthlyCost, 0))}</strong><span className="text-muted-foreground">User-confirmed cancellations only</span></CardContent></Card>
      </div>
      {cuts.length === 0 ? <Empty className="border border-dashed py-16"><EmptyHeader><EmptyTitle>Nothing cut yet.</EmptyTitle><EmptyDescription>When you cut, finish and track cancellation here.</EmptyDescription></EmptyHeader></Empty> : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {[...pending, ...confirmed].map(row => <CancellationCard key={`${row.id}-${row.updatedAt}`} row={row} today={today} onUpdate={onUpdate} onEdit={onEdit} />)}
        </div>
      )}
    </section>
  )
}

function CancellationCard({ row, today, onUpdate, onEdit }: { row: Subscription; today: string; onUpdate: Update; onEdit: (row: Subscription) => void }) {
  const pending = cancellationPending(row)
  const [confirming, setConfirming] = useState(false)
  const [date, setDate] = useState(today)
  const [note, setNote] = useState(row.cancellationNote ?? "")
  const [billingUrl, setBillingUrl] = useState(row.billingUrl ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelUrl = receiptCancelUrl(row.cancelUrl)
  const backup = receiptCancelUrl(row.billingUrl ?? "")
  const home = cancelUrl ? new URL(cancelUrl).origin : null
  async function save(patch: Partial<Subscription>) {
    if (busy) return
    setBusy(true); setError(null)
    try {
      if (!await onUpdate(row.id, patch)) setError("Could not save. Your cancellation status has not changed. Please try again.")
    } catch { setError("Could not save. Please try again.") }
    finally { setBusy(false) }
  }
  function downloadReminder() {
    const url = URL.createObjectURL(new Blob([cancellationCalendar(row, today)], { type: "text/calendar;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url; anchor.download = "ritestack-cancellation-reminder.ics"; document.body.appendChild(anchor); anchor.click(); anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <Card size="sm" data-cut-id={row.id}>
      <CardHeader><CardTitle className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-2.5"><ToolMark name={row.name} size="md" /><span className="break-words">{row.name}</span></span><span className="shrink-0 font-mono">{formatMoney(row.monthlyCost)}/mo</span></CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2"><Badge variant={pending ? "destructive" : "outline"}>{pending ? "Cancellation pending" : "Cancellation confirmed"}</Badge>{row.isSample ? <Badge variant="outline">Sample</Badge> : null}</div>
        <p className="text-xs text-muted-foreground">{row.cutAt ? `Decided to cut ${formatDate(row.cutAt)}` : "Cut date not recorded"}</p>
        {pending ? <p role="status">{row.renewDate < today ? "Renewal date has passed. Check whether you were charged." : `Renewal ${formatRelativeDay(row.renewDate, today)} (${formatDate(row.renewDate)}).`} Confirm cancellation with the provider before your next charge.</p> : <><p>Confirmed by you on {formatDate(row.cancellationConfirmedAt!)}. RiteStack has not independently verified billing.</p>{row.cancellationNote ? <p className="break-words text-muted-foreground">{row.cancellationNote}</p> : null}</>}
        <div className="flex flex-wrap gap-3 underline underline-offset-4">
          {cancelUrl ? <a href={cancelUrl} target="_blank" rel="noopener noreferrer">Open cancellation page</a> : <span className="no-underline text-muted-foreground">No cancellation link saved</span>}
          {backup ? <a href={backup} target="_blank" rel="noopener noreferrer">Backup billing page</a> : home ? <a href={home} target="_blank" rel="noopener noreferrer">Provider website</a> : null}
        </div>
        {pending ? <>
          <details><summary className="cursor-pointer">Link changed or asks you to sign in?</summary><div className="space-y-3 pt-2 text-muted-foreground">
            <p>Sign in to the provider, open Account or Settings → Billing / Subscription, and finish cancellation. If you subscribed through Apple or Google, manage it in that store. Save the provider’s confirmation; contact their support if cancellation is unavailable.</p>
            <Label htmlFor={`billing-${row.id}`}>Backup billing/settings URL (optional)</Label>
            <Input id={`billing-${row.id}`} type="url" value={billingUrl} onChange={event => setBillingUrl(event.target.value)} placeholder="https://provider.example/billing" disabled={busy} />
            <Button variant="outline" disabled={busy} onClick={() => {
              const value = billingUrl.trim()
              if (value && !receiptCancelUrl(value)) { setError("Enter an http or https billing URL."); return }
              void save({ billingUrl: value })
            }}>Save backup URL</Button>
            <Button variant="ghost" disabled={busy} onClick={() => onEdit(row)}>Edit cancellation link or renewal date</Button>
          </div></details>
          <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => setConfirming(!confirming)}>Confirm cancellation</Button><Button variant="outline" disabled={busy} onClick={downloadReminder}>Add calendar reminder</Button></div>
          <p className="text-xs text-muted-foreground">Reminders appear in Decide before renewal. Import the calendar file for a notification outside RiteStack. No reminder emails are sent. Remove imported reminders after confirming cancellation.</p>
          {confirming ? <form className="space-y-3 rounded-lg border p-3" onSubmit={event => {
            event.preventDefault()
            try { const next = confirmCancellation(row, date, note, today); void save({ cancellationConfirmedAt: next.cancellationConfirmedAt, cancellationNote: next.cancellationNote }) }
            catch (failure) { setError(failure instanceof Error ? failure.message : "Check your confirmation details.") }
          }}>
            <p>Only confirm after the provider shows cancellation is complete. Opening a link is not confirmation.</p>
            <Label htmlFor={`confirmed-${row.id}`}>Provider confirmation date</Label><Input id={`confirmed-${row.id}`} type="date" required max={today} value={date} onChange={event => setDate(event.target.value)} disabled={busy} />
            <Label htmlFor={`note-${row.id}`}>Confirmation note or reference (optional)</Label><Textarea id={`note-${row.id}`} value={note} onChange={event => setNote(event.target.value)} maxLength={500} disabled={busy} placeholder="Confirmation reference — no passwords or payment details" />
            <Label className="flex items-start gap-2"><input type="checkbox" required disabled={busy} />The provider confirmed my cancellation.</Label>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save confirmation"}</Button>
          </form> : null}
        </> : <Button variant="outline" disabled={busy} onClick={() => void save({ cancellationConfirmedAt: null, cancellationNote: "" })}>Reopen as pending</Button>}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}

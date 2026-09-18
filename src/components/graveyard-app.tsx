"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { Alert02Icon, Add01Icon, InboxIcon, Link01Icon, MoreHorizontalIcon, PauseIcon, ScissorIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { SubscriptionForm, parseCost } from "@/components/subscription-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { addDays, formatDate, formatMoney, formatRelativeDay, todayISO } from "@/lib/dates"
import {
  cutThisPass,
  decideByQueue,
  monthlyBurn,
  newId,
  PAUSE_REMIND_DAYS,
  queueReasons,
  reasonLabel,
} from "@/lib/ritual"
import { sampleStack } from "@/lib/sample-data"
import { StorageError } from "@/lib/storage"
import { useGraveyardStore } from "@/lib/use-graveyard-store"
import type { Decision, Subscription, SubscriptionDraft } from "@/lib/types"
import { ToolMark } from "@/components/tool-mark"
import { cn } from "@/lib/utils"

type AppView = "decide" | "inventory"

function readView(): AppView {
  if (typeof window === "undefined") return "decide"
  return window.location.hash.replace(/^#/, "") === "inventory" ? "inventory" : "decide"
}

function writeView(view: AppView) {
  const next = view === "inventory" ? "#inventory" : "#decide"
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", next)
  }
}

function decisionBadge(decision: Decision) {
  switch (decision) {
    case "keep":
      return <Badge variant="outline">Keep</Badge>
    case "cut":
      return <Badge variant="destructive">Cut</Badge>
    case "pause":
      return <Badge variant="secondary">Pause</Badge>
    default:
      return <Badge variant="ghost">Undecided</Badge>
  }
}

function openCancelUrl(url: string) {
  if (!url) return
  window.open(url, "_blank", "noopener,noreferrer")
}

const EMPTY_SUBSCRIPTIONS: Subscription[] = []

function subscribeHydration() {
  return () => {}
}

export function GraveyardApp() {
  const today = todayISO()
  const { current, replace, reset } = useGraveyardStore()
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [view, setView] = useState<AppView>("decide")
  const subscriptions =
    current.status === "ok" ? current.store.subscriptions : EMPTY_SUBSCRIPTIONS
  const loadError = current.status === "error" ? current.message : null

  useEffect(() => {
    setView(readView())
    function onHash() {
      setView(readView())
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  function go(next: AppView) {
    setView(next)
    writeView(next)
  }

  function withSave(updater: (current: Subscription[]) => Subscription[]) {
    const next = updater(subscriptions)
    try {
      replace(next)
      setActionError(null)
      return true
    } catch (error) {
      setActionError(
        error instanceof StorageError
          ? error.message
          : "Could not save. The form is still open and nothing was overwritten."
      )
      return false
    }
  }

  const queue = useMemo(
    () => decideByQueue(subscriptions, today),
    [subscriptions, today]
  )
  const burn = monthlyBurn(subscriptions)
  const cut = cutThisPass(subscriptions)
  const sampleCount = subscriptions.filter((row) => row.isSample).length
  const undecided = subscriptions.filter(
    (row) => row.decision === "undecided"
  ).length

  function saveDraft(draft: SubscriptionDraft) {
    const now = new Date().toISOString()
    const saved = withSave((current) => {
      if (editing) {
        return current.map((row) =>
          row.id === editing.id
            ? {
                ...row,
                name: draft.name.trim(),
                monthlyCost: parseCost(draft.monthlyCost),
                renewDate: draft.renewDate,
                category: draft.category,
                cancelUrl: draft.cancelUrl.trim(),
                lastUsed: draft.lastUsedUnknown ? null : draft.lastUsed,
                updatedAt: now,
              }
            : row
        )
      }
      const created: Subscription = {
        id: newId(),
        name: draft.name.trim(),
        monthlyCost: parseCost(draft.monthlyCost),
        renewDate: draft.renewDate,
        category: draft.category,
        cancelUrl: draft.cancelUrl.trim(),
        lastUsed: draft.lastUsedUnknown ? null : draft.lastUsed,
        decision: "undecided",
        remindAt: null,
        isSample: false,
        cutAt: null,
        createdAt: now,
        updatedAt: now,
      }
      return [...current, created]
    })
    if (saved) {
      setFormOpen(false)
      setEditing(null)
    }
  }

  function decide(id: string, decision: Decision) {
    const now = new Date().toISOString()
    const target = subscriptions.find((row) => row.id === id)
    if (!target) return
    if (decision === "cut" && target.cancelUrl) openCancelUrl(target.cancelUrl)
    withSave((current) =>
      current.map((row) => {
        if (row.id !== id) return row
        return {
          ...row,
          decision,
          remindAt: decision === "pause" ? addDays(today, PAUSE_REMIND_DAYS) : null,
          cutAt: decision === "cut" ? today : null,
          updatedAt: now,
        }
      })
    )
  }

  function remove(id: string) {
    withSave((current) => current.filter((row) => row.id !== id))
  }

  function loadSample() {
    withSave((current) => {
      const withoutSample = current.filter((row) => !row.isSample)
      return [...withoutSample, ...sampleStack()]
    })
  }

  function stripSample() {
    withSave((current) => current.filter((row) => !row.isSample))
  }

  function resetStorage() {
    reset()
    setActionError(null)
  }

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
    setActionError(null)
  }

  function openEdit(row: Subscription) {
    setEditing(row)
    setFormOpen(true)
    setActionError(null)
  }

  if (!hydrated) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Loading your list…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-10">
        <Alert variant="destructive">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
          <AlertTitle>Couldn’t load the list</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button onClick={resetStorage}>Start a fresh list</Button>
      </main>
    )
  }

  return (
    <div className="flex min-h-full w-full max-w-[100vw] flex-1 flex-col overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur md:hidden">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RiteStack
        </p>
        {view === "inventory" ? (
          <>
            <p className="font-mono text-3xl font-medium tabular-nums tracking-tight">
              {formatMoney(burn)}
            </p>
            <p className="text-xs text-muted-foreground">Monthly burn · still paying</p>
          </>
        ) : (
          <>
            <p className="font-heading text-xl font-medium tracking-tight">Decide</p>
            <p className="text-xs text-muted-foreground">
              {queue.length === 0
                ? "Nothing waiting"
                : `${queue.length} tool${queue.length === 1 ? "" : "s"} need a decision`}
            </p>
          </>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:py-8 md:pb-8">
        <header className="hidden flex-col gap-3 md:flex">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                RiteStack
              </p>
              <h1 className="font-heading text-lg font-medium tracking-tight sm:text-xl">
                {view === "decide"
                  ? "You don’t miss the cancel button. You miss a date to decide."
                  : "Inventory"}
              </h1>
              <p className="max-w-2xl text-xs/relaxed text-muted-foreground">
                {view === "decide"
                  ? "Keep, cut, or pause — one sitting. The full list lives in Inventory."
                  : "The list you pay for. Add, edit, and see monthly burn. Ritual is Decide."}
              </p>
            </div>
            {view === "inventory" ? (
              <div className="flex flex-wrap gap-2">
                {subscriptions.length === 0 ? null : (
                  <Button variant="outline" onClick={loadSample}>
                    Load sample stack
                  </Button>
                )}
                <Button onClick={openAdd}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
                  Add subscription
                </Button>
              </div>
            ) : null}
          </div>
          <ViewTabs view={view} queueCount={queue.length} onView={go} />
        </header>

        {actionError ? (
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {view === "inventory" && sampleCount > 0 ? (
          <Alert>
            <AlertTitle>Sample AI-tool stack</AlertTitle>
            <AlertDescription>
              {sampleCount} labeled sample rows are in this list so you can run the ritual. They are not your real stack.
            </AlertDescription>
            <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={stripSample}>
              Remove sample rows
            </Button>
          </Alert>
        ) : null}

        {view === "decide" ? (
          subscriptions.length === 0 ? (
            <Empty className="border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Nothing to decide</EmptyTitle>
                <EmptyDescription>
                  Add the AI and dev tools you pay for, then keep, cut, or pause here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={openAdd}>Add a subscription</Button>
                  <Button variant="outline" onClick={() => go("inventory")}>
                    Open Inventory
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            <QueueSection
              today={today}
              rows={queue}
              onDecide={decide}
              onEdit={openEdit}
              onOpenInventory={() => go("inventory")}
              onAdd={openAdd}
            />
          )
        ) : subscriptions.length === 0 ? (
          <Empty className="border border-dashed py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No tools on the list yet</EmptyTitle>
              <EmptyDescription>
                Add the AI and dev tools you pay for. Keep, cut, or pause lives on Decide.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={openAdd}>Add a subscription</Button>
                <Button variant="outline" onClick={loadSample}>
                  Load a sample AI-tool stack
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <Button className="h-11 w-full md:hidden" onClick={openAdd}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
              Add subscription
            </Button>
            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Stat label="Monthly burn" value={formatMoney(burn)} hint="Still paying" />
              <Stat label="Cut this pass" value={formatMoney(cut)} hint="Burn dropped" />
              <Stat label="Decide-by" value={String(queue.length)} hint="Need a decision" />
              <Stat label="Still undecided" value={String(undecided)} hint="No keep/cut/pause yet" />
            </section>
            <InventorySection
              today={today}
              rows={subscriptions}
              onEdit={openEdit}
              onRemove={remove}
              onDecide={decide}
            />
          </>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-foreground/10 bg-background/95 px-2 pt-2 backdrop-blur md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ViewTabs view={view} queueCount={queue.length} onView={go} />
      </nav>

      {formOpen ? (
        <SubscriptionForm
          key={editing?.id ?? "new"}
          open={formOpen}
          today={today}
          editing={editing}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setEditing(null)
          }}
          onSave={saveDraft}
        />
      ) : null}
    </div>
  )
}

function ViewTabs({
  view,
  queueCount,
  onView,
}: {
  view: AppView
  queueCount: number
  onView: (next: AppView) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      <button
        type="button"
        onClick={() => onView("decide")}
        className={cn(
          "h-9 rounded-md text-sm font-medium transition-colors",
          view === "decide"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Decide{queueCount > 0 ? ` · ${queueCount}` : ""}
      </button>
      <button
        type="button"
        onClick={() => onView("inventory")}
        className={cn(
          "h-9 rounded-md text-sm font-medium transition-colors",
          view === "inventory"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Inventory
      </button>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-0">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-xl tabular-nums tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-[0.625rem] text-muted-foreground">{hint}</CardContent>
    </Card>
  )
}

function QueueSection({
  today,
  rows,
  onDecide,
  onEdit,
  onOpenInventory,
  onAdd,
}: {
  today: string
  rows: Subscription[]
  onDecide: (id: string, decision: Decision) => void
  onEdit: (row: Subscription) => void
  onOpenInventory: () => void
  onAdd: () => void
}) {
  return (
    <section className="space-y-3">
      <p className="hidden text-xs text-muted-foreground md:block">
        Renewing soon, last-used not set or stale, still undecided, and pauses that are due. One action per row.
      </p>
      {rows.length === 0 ? (
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyTitle>Nothing to decide</EmptyTitle>
            <EmptyDescription>
              Queue is empty. Open Inventory to browse the list, or add a tool.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={onOpenInventory}>Open Inventory</Button>
              <Button variant="outline" onClick={onAdd}>
                Add a subscription
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid gap-2 md:hidden">
            {rows.map((row) => (
              <QueueCard
                key={row.id}
                row={row}
                today={today}
                onDecide={onDecide}
                onEdit={onEdit}
              />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead className="text-right">$</TableHead>
                  <TableHead>Renews</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead className="text-right">Decide</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <NameCell row={row} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMoney(row.monthlyCost)}
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(row.renewDate)}</div>
                      <div className="text-[0.625rem] text-muted-foreground">
                        {formatRelativeDay(row.renewDate, today)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.lastUsed ? (
                        <>
                          <div>{formatDate(row.lastUsed)}</div>
                          <div className="text-[0.625rem] text-muted-foreground">
                            {formatRelativeDay(row.lastUsed, today)}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ReasonBadges row={row} today={today} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DecisionActions row={row} onDecide={onDecide} onEdit={onEdit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  )
}

function QueueCard({
  row,
  today,
  onDecide,
  onEdit,
}: {
  row: Subscription
  today: string
  onDecide: (id: string, decision: Decision) => void
  onEdit: (row: Subscription) => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <ToolMark name={row.name} size="lg" />
            <span className="truncate text-base">{row.name}</span>
          </span>
          <span className="font-mono text-lg tabular-nums">{formatMoney(row.monthlyCost)}</span>
        </CardTitle>
        <CardDescription>
          Renews {formatDate(row.renewDate)} · Last used{" "}
          {row.lastUsed ? formatDate(row.lastUsed) : "not set"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReasonBadges row={row} today={today} />
        <CancelLink row={row} />
        <HugeDecisionActions row={row} onDecide={onDecide} />
        <Button size="sm" variant="ghost" className="h-8 px-0 text-muted-foreground" onClick={() => onEdit(row)}>
          Edit
        </Button>
      </CardContent>
    </Card>
  )
}

function InventorySection({
  today,
  rows,
  onEdit,
  onRemove,
  onDecide,
}: {
  today: string
  rows: Subscription[]
  onEdit: (row: Subscription) => void
  onRemove: (id: string) => void
  onDecide: (id: string, decision: Decision) => void
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">
          Full list. Add and edit here. Keep / cut / pause is on Decide.
        </p>
      </div>
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <InventoryCard
            key={row.id}
            row={row}
            today={today}
            onEdit={onEdit}
          />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="hidden sm:table-cell">Renews</TableHead>
              <TableHead className="hidden md:table-cell">Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={row.decision === "cut" ? "opacity-60" : undefined}>
                <TableCell>
                  <NameCell row={row} />
                </TableCell>
                <TableCell className="text-muted-foreground">{row.category}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatMoney(row.monthlyCost)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDate(row.renewDate)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.lastUsed ? formatDate(row.lastUsed) : "Unknown"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {decisionBadge(row.decision)}
                    {row.decision === "pause" && row.remindAt ? (
                      <span className="text-[0.625rem] text-muted-foreground">
                        Remind {formatRelativeDay(row.remindAt, today)}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.name}`}>
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(row)}>Edit</DropdownMenuItem>
                      {row.cancelUrl ? (
                        <DropdownMenuItem onClick={() => openCancelUrl(row.cancelUrl)}>
                          Open cancel URL
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDecide(row.id, "keep")}>
                        Keep
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDecide(row.id, "pause")}>
                        Pause · remind in 30 days
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDecide(row.id, "cut")}>
                        Cut
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onRemove(row.id)}>
                        Delete row
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function InventoryCard({
  row,
  today,
  onEdit,
}: {
  row: Subscription
  today: string
  onEdit: (row: Subscription) => void
}) {
  return (
    <Card size="sm" className={row.decision === "cut" ? "opacity-70" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <ToolMark name={row.name} size="md" />
            <span className="truncate">{row.name}</span>
          </span>
          <span className="font-mono text-sm tabular-nums">{formatMoney(row.monthlyCost)}</span>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {decisionBadge(row.decision)}
          <span>{row.category}</span>
          {row.decision === "pause" && row.remindAt ? (
            <span>Remind {formatRelativeDay(row.remindAt, today)}</span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2">
        <CancelLink row={row} />
        <Button size="sm" variant="ghost" className="h-8 px-0 text-muted-foreground" onClick={() => onEdit(row)}>
          Edit
        </Button>
      </CardContent>
    </Card>
  )
}

function NameCell({ row }: { row: Subscription }) {
  return (
    <div className="min-w-32">
      <div className="flex items-center gap-1.5">
        <ToolMark name={row.name} size="md" />
        <span className="font-medium">{row.name}</span>
        {row.isSample ? (
          <Badge variant="outline" className="font-normal">
            Sample
          </Badge>
        ) : null}
      </div>
      <CancelLink row={row} className="text-[0.625rem]" />
    </div>
  )
}

function CancelLink({
  row,
  className,
}: {
  row: Subscription
  className?: string
}) {
  if (!row.cancelUrl) {
    return <span className={className ?? "text-xs text-muted-foreground"}>No cancel URL</span>
  }
  return (
    <a
      href={row.cancelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline ${className ?? ""}`}
    >
      <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-3.5" />
      Cancel URL
    </a>
  )
}

function ReasonBadges({ row, today }: { row: Subscription; today: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {queueReasons(row, today).map((reason) => (
        <Badge key={reason} variant="secondary">
          {reasonLabel(reason)}
        </Badge>
      ))}
    </div>
  )
}

function HugeDecisionActions({
  row,
  onDecide,
}: {
  row: Subscription
  onDecide: (id: string, decision: Decision) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {([
        ["keep", "Keep", "outline"],
        ["pause", "Pause", "outline"],
        ["cut", "Cut", "destructive"],
      ] as const).map(([decision, label, variant]) => (
        <div key={decision} className="min-w-0">
          <Button
            className="h-11 w-full min-w-0 px-1 text-sm"
            variant={variant}
            onClick={() => onDecide(row.id, decision)}
          >
            {label}
          </Button>
        </div>
      ))}
    </div>
  )
}

function DecisionActions({
  row,
  onDecide,
  onEdit,
}: {
  row: Subscription
  onDecide: (id: string, decision: Decision) => void
  onEdit: (row: Subscription) => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button size="sm" variant="outline" onClick={() => onDecide(row.id, "keep")}>
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-icon="inline-start" />
        Keep
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDecide(row.id, "pause")}>
        <HugeiconsIcon icon={PauseIcon} strokeWidth={2} data-icon="inline-start" />
        Pause
      </Button>
      <Button size="sm" variant="destructive" onClick={() => onDecide(row.id, "cut")}>
        <HugeiconsIcon icon={ScissorIcon} strokeWidth={2} data-icon="inline-start" />
        Cut
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
        Edit
      </Button>
    </div>
  )
}

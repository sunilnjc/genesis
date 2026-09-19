"use client"

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Alert02Icon, Add01Icon, InboxIcon, Link01Icon, MoreHorizontalIcon, PauseIcon, PlayIcon, ScissorIcon, Tick02Icon } from "@hugeicons/core-free-icons"
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
  unpauseSubscription,
} from "@/lib/ritual"
import { sampleStack } from "@/lib/sample-data"
import { StorageError } from "@/lib/storage"
import { useGraveyardStore } from "@/lib/use-graveyard-store"
import type { Decision, Subscription, SubscriptionDraft } from "@/lib/types"
import { ToolMark } from "@/components/tool-mark"
import { PaywallCard, TrialBanner } from "@/components/paywall"
import { cn } from "@/lib/utils"
import { useEntitlement } from "@/lib/use-entitlement"
import { pathForView, pathFromHash, viewFromPathname, type AppView } from "@/lib/views"

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

export function GraveyardApp({
  headerAccessory,
}: {
  headerAccessory?: ReactNode
}) {
  const today = todayISO()
  const { current, replace, reset, loading, canMutate } = useGraveyardStore()
  const {
    status: access,
    error: billingError,
    checkoutBusy,
    unlock,
  } = useEntitlement()
  const ritual = access.ritual
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const view = viewFromPathname(pathname)
  const subscriptions =
    current.status === "ok" ? current.store.subscriptions : EMPTY_SUBSCRIPTIONS
  const loadError = current.status === "error" ? current.message : null

  useEffect(() => {
    const next = pathFromHash(window.location.hash)
    if (!next) return
    if (next !== pathname) router.replace(next)
    else if (window.location.hash) router.replace(pathname)
  }, [pathname, router])

  async function withSave(updater: (current: Subscription[]) => Subscription[]) {
    const next = updater(subscriptions)
    try {
      await replace(next)
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

  async function saveDraft(draft: SubscriptionDraft) {
    const now = new Date().toISOString()
    const saved = await withSave((current) => {
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
    if (!ritual) return
    const now = new Date().toISOString()
    const target = subscriptions.find((row) => row.id === id)
    if (!target) return
    if (decision === "cut" && target.cancelUrl) openCancelUrl(target.cancelUrl)
    void withSave((current) =>
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

  function unpause(id: string) {
    if (!ritual) return
    const now = new Date().toISOString()
    void withSave((current) =>
      current.map((row) => {
        if (row.id !== id || row.decision !== "pause") return row
        return unpauseSubscription(row, now)
      })
    )
  }

  function remove(id: string) {
    void withSave((current) => current.filter((row) => row.id !== id))
  }

  function loadSample() {
    if (!canMutate) return
    void withSave((current) => {
      const withoutSample = current.filter((row) => !row.isSample)
      return [...withoutSample, ...sampleStack()]
    })
  }

  function stripSample() {
    void withSave((current) => current.filter((row) => !row.isSample))
  }

  function resetStorage() {
    void reset()
    setActionError(null)
  }

  function openAdd() {
    if (!canMutate) return
    setEditing(null)
    setFormOpen(true)
    setActionError(null)
  }

  function openEdit(row: Subscription) {
    setEditing(row)
    setFormOpen(true)
    setActionError(null)
  }

  if (!hydrated || loading) {
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
    <div
      className="flex min-h-0 w-full max-w-[100vw] flex-1 flex-col overflow-x-hidden"
      data-ritestack-chrome="app"
      data-view={view}
    >
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur md:hidden">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            RiteStack
          </p>
          {headerAccessory}
        </div>
        {view === "inventory" ? (
          <>
            <p className="font-mono text-3xl font-medium tabular-nums tracking-tight">
              {hydrated ? formatMoney(burn) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Monthly burn · still paying</p>
          </>
        ) : (
          <>
            <p className="font-heading text-xl font-medium tracking-tight">Decide</p>
            <p className="text-xs text-muted-foreground">
              {!hydrated
                ? "Loading your queue…"
                : queue.length === 0
                  ? "Nothing waiting"
                  : `${queue.length} tool${queue.length === 1 ? "" : "s"} need a decision`}
            </p>
          </>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 pb-6 md:py-8 md:pb-8">
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
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {headerAccessory}
              {hydrated && canMutate ? (
                <div className="flex flex-wrap gap-2">
                  {view === "inventory" && subscriptions.length > 0 ? (
                    <Button variant="outline" onClick={loadSample}>
                      Load sample stack
                    </Button>
                  ) : null}
                  <Button onClick={openAdd}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
                    Add subscription
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <ViewTabs view={view} queueCount={queue.length} />
        </header>

        {actionError ? (
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {hydrated && view === "inventory" && sampleCount > 0 ? (
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

        {access.state === "trial" ? <TrialBanner status={access} /> : null}
        {access.state === "paywall" && view === "inventory" ? (
          <Alert>
            <AlertTitle>Ritual locked</AlertTitle>
            <AlertDescription>
              The list stays free. Keep / cut / pause, cancel URLs, and reminders unlock with the $14 pack — open Decide.
            </AlertDescription>
          </Alert>
        ) : null}
        {access.state === "paywall" && view === "decide" ? (
          <PaywallCard status={access} error={billingError} busy={checkoutBusy} onUnlock={() => void unlock()} />
        ) : null}

        {!hydrated ? (
          <div className="space-y-2">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <p className="text-xs text-muted-foreground">Loading your list…</p>
          </div>
        ) : view === "decide" ? (
          subscriptions.length === 0 ? (
            <Empty className="border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Nothing to decide</EmptyTitle>
                <EmptyDescription>
                  {canMutate
                    ? "Add the AI and dev tools you pay for, then keep, cut, or pause here."
                    : "Sign in to see your own tools. Unsigned visitors get an empty list — never a shared demo stack."}
                </EmptyDescription>
              </EmptyHeader>
              {canMutate ? (
                <EmptyContent>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={openAdd}>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
                      Add a subscription
                    </Button>
                  </div>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <QueueSection
              today={today}
              rows={queue}
              ritual={ritual}
              onDecide={decide}
              onUnpause={unpause}
              onEdit={openEdit}
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
                {canMutate
                  ? "Add the AI and dev tools you pay for. Keep, cut, or pause lives on Decide."
                  : "Sign in to load your stack. This URL is not a shared notebook."}
              </EmptyDescription>
            </EmptyHeader>
            {canMutate ? (
              <EmptyContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={openAdd}>Add a subscription</Button>
                  <Button variant="outline" onClick={loadSample}>
                    Load a sample AI-tool stack
                  </Button>
                </div>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <>
            {canMutate ? (
            <Button className="h-11 w-full md:hidden" onClick={openAdd}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
              Add subscription
            </Button>
            ) : null}
            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Stat label="Monthly burn" value={formatMoney(burn)} hint="Still paying" />
              <Stat label="Cut this pass" value={formatMoney(cut)} hint="Burn dropped" />
              <Link href={pathForView("decide")} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                <Stat label="Decide-by" value={String(queue.length)} hint="Open Decide" />
              </Link>
              <Stat label="Still undecided" value={String(undecided)} hint="No keep/cut/pause yet" />
            </section>
            <InventorySection
              today={today}
              rows={subscriptions}
              ritual={ritual}
              onEdit={openEdit}
              onUnpause={unpause}
              onRemove={remove}
            />
          </>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-foreground/10 bg-background/95 px-2 pt-2 backdrop-blur md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ViewTabs view={view} queueCount={queue.length} />
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
}: {
  view: AppView
  queueCount: number
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      role="tablist"
      aria-label="Switch RiteStack views"
    >
      <Link
        href={pathForView("decide")}
        role="tab"
        aria-selected={view === "decide"}
        aria-current={view === "decide" ? "page" : undefined}
        className={cn(
          "flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
          view === "decide"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Decide{queueCount > 0 ? ` · ${queueCount}` : ""}
      </Link>
      <Link
        href={pathForView("inventory")}
        role="tab"
        aria-selected={view === "inventory"}
        aria-current={view === "inventory" ? "page" : undefined}
        className={cn(
          "flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
          view === "inventory"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Inventory
      </Link>
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
  ritual,
  onDecide,
  onUnpause,
  onEdit,
}: {
  today: string
  rows: Subscription[]
  ritual: boolean
  onDecide: (id: string, decision: Decision) => void
  onUnpause: (id: string) => void
  onEdit: (row: Subscription) => void
}) {
  return (
    <section className="space-y-3" data-list="decide-by">
      <p className="hidden text-xs text-muted-foreground md:block">
        Renewing soon, last-used not set or stale, still undecided, and pauses that are due. One action per row.
      </p>
      {rows.length === 0 ? (
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyTitle>Nothing to decide</EmptyTitle>
            <EmptyDescription>
              Queue is empty. Open Inventory to browse the full list or add a tool.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href={pathForView("inventory")}>Open Inventory</Link>
            </Button>
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
                ritual={ritual}
                onDecide={onDecide}
                onUnpause={onUnpause}
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
                      <NameCell row={row} ritual={ritual} />
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
                      {ritual ? (
                        <DecisionActions
                          row={row}
                          onDecide={onDecide}
                          onUnpause={onUnpause}
                          onEdit={onEdit}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      )}
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
  ritual,
  onDecide,
  onUnpause,
  onEdit,
}: {
  row: Subscription
  today: string
  ritual: boolean
  onDecide: (id: string, decision: Decision) => void
  onUnpause: (id: string) => void
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
        <CancelLink row={row} ritual={ritual} />
        {ritual ? (
          <HugeDecisionActions row={row} onDecide={onDecide} onUnpause={onUnpause} />
        ) : null}
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
  ritual,
  onEdit,
  onUnpause,
  onRemove,
}: {
  today: string
  rows: Subscription[]
  ritual: boolean
  onEdit: (row: Subscription) => void
  onUnpause: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <section className="space-y-3" data-list="inventory">
      <div>
        <p className="text-xs text-muted-foreground">
          Full list. Add and edit here. Unpause a paused tool to send it back to Decide.
        </p>
      </div>
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <InventoryCard
            key={row.id}
            row={row}
            today={today}
            ritual={ritual}
            onEdit={onEdit}
            onUnpause={onUnpause}
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
                  <NameCell row={row} ritual={ritual} />
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
                  <div className="flex flex-col items-start gap-1.5">
                    {decisionBadge(row.decision)}
                    {row.decision === "pause" && row.remindAt ? (
                      <span className="text-[0.625rem] text-muted-foreground">
                        Remind {formatRelativeDay(row.remindAt, today)}
                      </span>
                    ) : null}
                    {row.decision === "pause" && ritual ? (
                      <UnpauseButton name={row.name} onUnpause={() => onUnpause(row.id)} />
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
                      {row.decision === "pause" && ritual ? (
                        <DropdownMenuItem onClick={() => onUnpause(row.id)}>
                          Unpause
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => onEdit(row)}>Edit</DropdownMenuItem>
                      {row.cancelUrl && ritual ? (
                        <DropdownMenuItem onClick={() => openCancelUrl(row.cancelUrl)}>
                          Open cancel URL
                        </DropdownMenuItem>
                      ) : null}
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
  ritual,
  onEdit,
  onUnpause,
}: {
  row: Subscription
  today: string
  ritual: boolean
  onEdit: (row: Subscription) => void
  onUnpause: (id: string) => void
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
        <CancelLink row={row} ritual={ritual} />
        {row.decision === "pause" && ritual ? (
          <UnpauseButton
            name={row.name}
            onUnpause={() => onUnpause(row.id)}
            className="h-11 px-3"
          />
        ) : null}
        <Button size="sm" variant="ghost" className="h-8 px-0 text-muted-foreground" onClick={() => onEdit(row)}>
          Edit
        </Button>
      </CardContent>
    </Card>
  )
}

function NameCell({ row, ritual }: { row: Subscription; ritual: boolean }) {
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
      <CancelLink row={row} ritual={ritual} className="text-[0.625rem]" />
    </div>
  )
}

function CancelLink({
  row,
  ritual,
  className,
}: {
  row: Subscription
  ritual: boolean
  className?: string
}) {
  if (!row.cancelUrl) {
    return <span className={className ?? "text-xs text-muted-foreground"}>No cancel URL</span>
  }
  if (!ritual) {
    return <span className={className ?? "text-xs text-muted-foreground"}>Cancel URL locked</span>
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

function UnpauseButton({
  name,
  onUnpause,
  className,
}: {
  name: string
  onUnpause: () => void
  className?: string
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={`Unpause ${name}`}
      data-action="unpause"
      className={className}
      onClick={onUnpause}
    >
      <HugeiconsIcon icon={PlayIcon} strokeWidth={2} data-icon="inline-start" />
      Unpause
    </Button>
  )
}

function HugeDecisionActions({
  row,
  onDecide,
  onUnpause,
}: {
  row: Subscription
  onDecide: (id: string, decision: Decision) => void
  onUnpause: (id: string) => void
}) {
  const paused = row.decision === "pause"
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <div className="min-w-0">
        <Button
          className="h-11 w-full min-w-0 px-1 text-sm"
          variant="outline"
          onClick={() => onDecide(row.id, "keep")}
        >
          Keep
        </Button>
      </div>
      <div className="min-w-0">
        {paused ? (
          <UnpauseButton
            name={row.name}
            onUnpause={() => onUnpause(row.id)}
            className="h-11 w-full min-w-0 px-1 text-sm"
          />
        ) : (
          <Button
            className="h-11 w-full min-w-0 px-1 text-sm"
            variant="outline"
            onClick={() => onDecide(row.id, "pause")}
          >
            Pause
          </Button>
        )}
      </div>
      <div className="min-w-0">
        <Button
          className="h-11 w-full min-w-0 px-1 text-sm"
          variant="destructive"
          onClick={() => onDecide(row.id, "cut")}
        >
          Cut
        </Button>
      </div>
    </div>
  )
}

function DecisionActions({
  row,
  onDecide,
  onUnpause,
  onEdit,
}: {
  row: Subscription
  onDecide: (id: string, decision: Decision) => void
  onUnpause: (id: string) => void
  onEdit: (row: Subscription) => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button size="sm" variant="outline" onClick={() => onDecide(row.id, "keep")}>
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-icon="inline-start" />
        Keep
      </Button>
      {row.decision === "pause" ? (
        <UnpauseButton name={row.name} onUnpause={() => onUnpause(row.id)} />
      ) : (
        <Button size="sm" variant="outline" onClick={() => onDecide(row.id, "pause")}>
          <HugeiconsIcon icon={PauseIcon} strokeWidth={2} data-icon="inline-start" />
          Pause
        </Button>
      )}
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

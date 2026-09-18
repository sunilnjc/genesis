"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BRAND_CATALOG } from "@/lib/brand-catalog"
import {
  cancelUrlFromLookup,
  type CancelLookupResponse,
} from "@/lib/cancel-lookup-client"
import { emptyDraft, parseCost, validateDraft } from "@/lib/validate"
import { CATEGORIES, type Subscription, type SubscriptionDraft } from "@/lib/types"
import { ToolMark } from "@/components/tool-mark"

type Props = {
  open: boolean
  today: string
  editing: Subscription | null
  onOpenChange: (open: boolean) => void
  onSave: (draft: SubscriptionDraft) => void
}

function draftFromSub(sub: Subscription): SubscriptionDraft {
  return {
    name: sub.name,
    monthlyCost: String(sub.monthlyCost),
    renewDate: sub.renewDate,
    category: sub.category,
    cancelUrl: sub.cancelUrl,
    lastUsedUnknown: sub.lastUsed == null,
    lastUsed: sub.lastUsed ?? "",
  }
}

export function SubscriptionForm({
  open,
  today,
  editing,
  onOpenChange,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<SubscriptionDraft>(() =>
    editing ? draftFromSub(editing) : emptyDraft(today)
  )
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({})
  const [finding, setFinding] = useState(false)
  const filledBy = useRef("")
  const userOwnsCancel = useRef(false)
  const lookupGen = useRef(0)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    const name = draft.name.trim()
    if (!open || !name || userOwnsCancel.current) {
      lookupGen.current += 1
      setFinding(false)
      return
    }

    const gen = ++lookupGen.current
    setFinding(true)
    const handle = window.setTimeout(() => {
      void runLookup(name, gen)
    }, 450)
    return () => window.clearTimeout(handle)
  }, [draft.name, open])

  async function runLookup(name: string, gen: number) {
    try {
      const response = await fetch("/api/cancel-lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const result = (await response.json()) as CancelLookupResponse
      if (gen !== lookupGen.current) return
      applyLookup(name, result.url)
    } catch {
      if (gen !== lookupGen.current) return
      applyLookup(name, null)
    }
  }

  function applyLookup(name: string, resultUrl: string | null | undefined) {
    if (userOwnsCancel.current) {
      setFinding(false)
      return
    }
    const current = draftRef.current
    if (current.name.trim() !== name) return
    const next = cancelUrlFromLookup({
      current: current.cancelUrl,
      filledBy: filledBy.current,
      userOwns: false,
      resultUrl,
    })
    filledBy.current = next.filledBy
    setDraft((row) => (row.cancelUrl === next.cancelUrl ? row : { ...row, cancelUrl: next.cancelUrl }))
    setFinding(false)
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validateDraft(draft)
    if (Object.keys(nextErrors).length > 0) {
      setErrors({
        ...nextErrors,
        form: "Didn’t save. Fix the fields below — the form is still here.",
      })
      return
    }
    try {
      parseCost(draft.monthlyCost)
      onSave(draft)
      setErrors({})
    } catch {
      setErrors({
        form: "Didn’t save. The list is unchanged. Stay here and try again.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subscription" : "Add a tool you pay for"}</DialogTitle>
          <DialogDescription>
            Name, monthly $, renew date, category, cancel URL. Last-used is a date you set, or unknown.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {errors.form ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
              {errors.form}
            </p>
          ) : null}
          <FieldGroup className="gap-3">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="sub-name">Name</FieldLabel>
              <div className="flex items-center gap-2">
                <ToolMark name={draft.name} size="md" />
                <Input
                  id="sub-name"
                  value={draft.name}
                  aria-invalid={!!errors.name}
                  placeholder="Cursor, Netlify, Fly…"
                  list="ritestack-catalog-names"
                  autoComplete="off"
                  onChange={(event) => {
                    const name = event.target.value
                    setDraft((current) => {
                      if (userOwnsCancel.current) return { ...current, name }
                      if (current.cancelUrl && current.cancelUrl === filledBy.current) {
                        filledBy.current = ""
                        return { ...current, name, cancelUrl: "" }
                      }
                      return { ...current, name }
                    })
                  }}
                />
                <datalist id="ritestack-catalog-names">
                  {BRAND_CATALOG.map((brand) => (
                    <option key={brand.slug} value={brand.title} />
                  ))}
                </datalist>
              </div>
              <FieldError>{errors.name}</FieldError>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.monthlyCost}>
                <FieldLabel htmlFor="sub-cost">Monthly $</FieldLabel>
                <Input
                  id="sub-cost"
                  inputMode="decimal"
                  value={draft.monthlyCost}
                  aria-invalid={!!errors.monthlyCost}
                  placeholder="20"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      monthlyCost: event.target.value,
                    }))
                  }
                />
                <FieldError>{errors.monthlyCost}</FieldError>
              </Field>
              <Field data-invalid={!!errors.renewDate}>
                <FieldLabel htmlFor="sub-renew">Renew date</FieldLabel>
                <Input
                  id="sub-renew"
                  type="date"
                  value={draft.renewDate}
                  aria-invalid={!!errors.renewDate}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      renewDate: event.target.value,
                    }))
                  }
                />
                <FieldError>{errors.renewDate}</FieldError>
              </Field>
            </div>
            <Field data-invalid={!!errors.category}>
              <FieldLabel htmlFor="sub-category">Category</FieldLabel>
              <Select
                value={draft.category}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    category: value as SubscriptionDraft["category"],
                  }))
                }
              >
                <SelectTrigger id="sub-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.category}</FieldError>
            </Field>
            <Field data-invalid={!!errors.cancelUrl}>
              <FieldLabel htmlFor="sub-cancel">Cancel URL</FieldLabel>
              <Input
                id="sub-cancel"
                type="url"
                value={draft.cancelUrl}
                aria-invalid={!!errors.cancelUrl}
                placeholder="https://…"
                data-cancel-lookup={finding ? "looking" : draft.cancelUrl ? "found" : "idle"}
                onChange={(event) => {
                  userOwnsCancel.current = true
                  filledBy.current = ""
                  setFinding(false)
                  setDraft((current) => ({
                    ...current,
                    cancelUrl: event.target.value,
                  }))
                }}
              />
              {finding && !userOwnsCancel.current ? (
                <FieldDescription>finding cancel link…</FieldDescription>
              ) : null}
              <FieldError>{errors.cancelUrl}</FieldError>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sub-unknown"
                  checked={draft.lastUsedUnknown}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      lastUsedUnknown: checked === true,
                    }))
                  }
                />
                <FieldLabel htmlFor="sub-unknown" className="font-normal">
                  Last-used unknown
                </FieldLabel>
              </div>
            </Field>
            {!draft.lastUsedUnknown ? (
              <Field data-invalid={!!errors.lastUsed}>
                <FieldLabel htmlFor="sub-last-used">Last used</FieldLabel>
                <Input
                  id="sub-last-used"
                  type="date"
                  value={draft.lastUsed}
                  aria-invalid={!!errors.lastUsed}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      lastUsed: event.target.value,
                    }))
                  }
                />
                <FieldError>{errors.lastUsed}</FieldError>
              </Field>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Add to list"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { parseCost }

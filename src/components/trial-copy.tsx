import { remainingTrialLabel, TRIAL_PACK_COPY } from "@/lib/trial-copy"
import { cn } from "@/lib/utils"

export function TrialCopyLine({
  surface,
  daysLeft = null,
  className,
}: {
  surface: "unsigned" | "signed-in"
  daysLeft?: number | null
  className?: string
}) {
  const remaining = remainingTrialLabel(daysLeft)
  return (
    <p
      data-ritestack-trial-copy={surface}
      {...(remaining && daysLeft != null ? { "data-ritestack-trial-days": String(daysLeft) } : {})}
      className={cn("text-xs/relaxed text-muted-foreground", className)}
    >
      <span>{TRIAL_PACK_COPY}</span>
      {remaining ? <span data-ritestack-trial-remaining=""> {remaining}.</span> : null}
    </p>
  )
}

import { cn } from "@/lib/utils"
import { brandInitial, matchBrand } from "@/lib/brand-catalog"

export function ToolMark({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const brand = matchBrand(name)

  if (!brand) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted text-[0.625rem] font-medium text-muted-foreground",
          className
        )}
      >
        {brandInitial(name)}
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={brand.title}
      className={cn(
        "inline-block size-4 shrink-0 bg-foreground text-foreground",
        className
      )}
      style={{
        maskImage: `url(${brand.src})`,
        WebkitMaskImage: `url(${brand.src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  )
}

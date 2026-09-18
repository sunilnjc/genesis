import { cn } from "@/lib/utils"
import { brandInitial, matchBrand } from "@/lib/brand-catalog"

const sizes = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const

export function ToolMark({
  name,
  className,
  size = "sm",
}: {
  name: string
  className?: string
  size?: keyof typeof sizes
}) {
  const brand = matchBrand(name)

  if (!brand) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-sm bg-muted text-[0.625rem] font-medium text-muted-foreground",
          sizes[size],
          className
        )}
      >
        {brandInitial(name)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        brand.plate && "rounded-[3px] bg-neutral-200 p-px",
        sizes[size],
        className
      )}
    >
      {/* Painted SVG — brand hex, never currentColor / foreground / white mask. */}
      <img
        src={brand.src}
        alt={brand.title}
        className="size-full object-contain"
        draggable={false}
      />
    </span>
  )
}

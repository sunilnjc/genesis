export type AppView = "decide" | "inventory"

export function viewFromPathname(pathname: string): AppView {
  return pathname === "/inventory" || pathname.startsWith("/inventory/")
    ? "inventory"
    : "decide"
}

export function pathForView(view: AppView): string {
  return view === "inventory" ? "/inventory" : "/"
}

/** Old hash URLs from the first split attempt. */
export function pathFromHash(hash: string): string | null {
  const value = hash.replace(/^#/, "")
  if (value === "inventory") return "/inventory"
  if (value === "decide") return "/"
  return null
}

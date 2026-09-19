export const CHECKOUT_RETURN_PATHS = ["/", "/unlock"] as const
export type CheckoutReturnPath = (typeof CHECKOUT_RETURN_PATHS)[number]

export function checkoutReturnPath(value: unknown): CheckoutReturnPath {
  return value === "/unlock" ? "/unlock" : "/"
}

export function checkoutReturnUrls(appUrl: string, returnPath: CheckoutReturnPath = "/") {
  const prefix = returnPath === "/" ? `${appUrl}/` : `${appUrl}${returnPath}`
  return {
    success_url: `${prefix}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${prefix}?checkout=cancel`,
  }
}

export async function checkoutReturnPathFromRequest(request: Request): Promise<CheckoutReturnPath> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return "/"
  try {
    const body = (await request.json()) as { returnTo?: unknown }
    return checkoutReturnPath(body?.returnTo)
  } catch {
    return "/"
  }
}

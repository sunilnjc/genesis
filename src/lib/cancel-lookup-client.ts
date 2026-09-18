export type CancelLookupResponse = {
  url?: string | null
}

export function cancelUrlFromLookup(args: {
  current: string
  filledBy: string
  userOwns: boolean
  resultUrl: string | null | undefined
}): { cancelUrl: string; filledBy: string } {
  if (args.userOwns) {
    return { cancelUrl: args.current, filledBy: args.filledBy }
  }
  const url = typeof args.resultUrl === "string" ? args.resultUrl.trim() : ""
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return { cancelUrl: url, filledBy: url }
  }
  if (!args.current || args.current === args.filledBy) {
    return { cancelUrl: "", filledBy: "" }
  }
  return { cancelUrl: args.current, filledBy: args.filledBy }
}

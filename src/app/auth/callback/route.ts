import { NextResponse, type NextRequest } from "next/server"
import {
  authErrorPath,
  classifyAuthFailure,
  parseAuthCallbackSearch,
  safeNextPath,
} from "@/lib/auth/callback"
import { applyCookies, createRiteStackServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function fail(request: NextRequest, reason: ReturnType<typeof classifyAuthFailure>, pending: Parameters<typeof applyCookies>[1]) {
  return applyCookies(NextResponse.redirect(new URL(authErrorPath(reason), request.url)), pending)
}

export async function GET(request: NextRequest) {
  const parsed = parseAuthCallbackSearch(request.nextUrl.search)
  const next = safeNextPath(request.nextUrl.searchParams.get("next"))
  const { supabase, pending } = createRiteStackServerClient(request)

  if (!supabase) {
    return fail(request, "config", pending)
  }

  if (parsed.kind === "provider_error") {
    return fail(request, classifyAuthFailure(parsed.error), pending)
  }

  try {
    if (parsed.kind === "token_hash" && parsed.tokenHash && parsed.type) {
      const { error } = await supabase.auth.verifyOtp({
        type: parsed.type,
        token_hash: parsed.tokenHash,
      })
      if (error) return fail(request, classifyAuthFailure(error.message), pending)
      return applyCookies(NextResponse.redirect(new URL(next, request.url)), pending)
    }

    if (parsed.kind === "pkce_code" && parsed.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(parsed.code)
      if (error) return fail(request, classifyAuthFailure(error.message), pending)
      return applyCookies(NextResponse.redirect(new URL(next, request.url)), pending)
    }

    const { data } = await supabase.auth.getUser()
    if (data.user) {
      return applyCookies(NextResponse.redirect(new URL(next, request.url)), pending)
    }
    return fail(request, parsed.kind === "empty" ? "missing" : classifyAuthFailure(null), pending)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ""
    return fail(request, classifyAuthFailure(message), pending)
  }
}

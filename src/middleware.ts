import { type NextRequest, NextResponse } from "next/server"
import { applyCookies, createRiteStackServerClient } from "@/lib/supabase/server"

export async function middleware(request: NextRequest) {
  const { supabase, pending } = createRiteStackServerClient(request)
  if (supabase) {
    await supabase.auth.getUser()
  }
  return applyCookies(NextResponse.next({ request }), pending)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|brands/|manifest.webmanifest).*)"],
}

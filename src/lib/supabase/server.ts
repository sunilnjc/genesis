import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { assertNotJobPursuit, isSupabaseConfigured, readPublicSupabaseEnv } from "@/lib/auth/config"

export type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export function createRiteStackServerClient(request: NextRequest) {
  const pending: CookieToSet[] = []
  if (!isSupabaseConfigured()) {
    return { supabase: null, pending }
  }

  const { url, anonKey } = readPublicSupabaseEnv()
  assertNotJobPursuit(url)
  const secure = new URL(request.url).protocol === "https:"

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        pending.push(...cookiesToSet)
      },
    },
  })

  return { supabase, pending }
}

export function applyCookies(response: NextResponse, cookies: CookieToSet[]) {
  for (const { name, value, options } of cookies) {
    const nextOptions = { ...options }
    delete (nextOptions as { name?: string }).name
    response.cookies.set(name, value, nextOptions)
  }
  return response
}

"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { assertNotJobPursuit, isSupabaseConfigured, readPublicSupabaseEnv } from "@/lib/auth/config"

let browserClient: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (browserClient) return browserClient

  const { url, anonKey } = readPublicSupabaseEnv()
  assertNotJobPursuit(url)

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })
  return browserClient
}

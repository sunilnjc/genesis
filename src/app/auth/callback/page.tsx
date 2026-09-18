"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getBrowserSupabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = getBrowserSupabase()
    if (!client) {
      setError("Supabase is not configured in this build.")
      return
    }

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const queryError = params.get("error_description") ?? params.get("error")
    if (queryError) {
      setError(queryError)
      return
    }

    async function complete() {
      try {
        if (code) {
          const { error: exchangeError } = await client!.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else {
          const { error: sessionError } = await client!.auth.getSession()
          if (sessionError) throw sessionError
        }
        router.replace("/")
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not finish sign-in.")
      }
    }

    void complete()
  }, [router])

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
        <h1 className="font-heading text-xl">Sign-in didn’t finish</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => router.replace("/")}>Back to RiteStack</Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2 px-4 py-10">
      <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        RiteStack
      </p>
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
    </main>
  )
}

"use client"

import { AuthStatusChip, LoginScreen } from "@/components/auth-gate"
import { GraveyardApp } from "@/components/graveyard-app"
import { useAuth } from "@/lib/auth"

export function HostedApp() {
  const auth = useAuth()

  if (auth.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Checking session…</p>
      </div>
    )
  }

  if (auth.configured && !auth.isLocalhost && auth.status !== "signed-in") {
    return <LoginScreen />
  }

  if (auth.configured === false && !auth.isLocalhost) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-10">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RiteStack
        </p>
        <h1 className="font-heading text-xl">Hosted login isn’t wired yet</h1>
        <p className="text-sm text-muted-foreground">
          This URL needs the RiteStack Supabase project (not Job Pursuit). Localhost can keep using
          the on-device list until that env is set.
        </p>
      </main>
    )
  }

  return (
    <>
      <div className="hidden" data-ritestack-user-id={auth.userId ?? ""} />
      <GraveyardApp headerAccessory={<AuthStatusChip />} />
    </>
  )
}

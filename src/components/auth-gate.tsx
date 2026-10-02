"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { EmailCodeForm } from "@/components/email-code-form"
import { KeepCutPauseStreamer } from "@/components/keep-cut-pause-streamer"
import { TrialCopyLine } from "@/components/trial-copy"
import { SIGNIN_BRAND, SIGNIN_CONTEXT, SIGNIN_HEADLINE } from "@/lib/signin-copy"

export function LoginScreen({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? "section" : "main"
  const Heading = embedded ? "h2" : "h1"
  return (
    <Container
      id={embedded ? "sign-in" : undefined}
      data-ritestack-signin="unsigned"
      data-ritestack-screen="login"
      className={embedded ? "flex flex-col gap-6 rounded-xl border border-foreground/10 bg-card p-6" : "mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10"}
    >
      <div className="space-y-3">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {SIGNIN_BRAND}
        </p>
        <Heading className="font-heading text-2xl font-medium tracking-tight">{SIGNIN_HEADLINE}</Heading>
        <div className="space-y-2">
          <KeepCutPauseStreamer />
          <p className="text-sm text-muted-foreground">{SIGNIN_CONTEXT}</p>
          <TrialCopyLine surface="unsigned" />
        </div>
      </div>
      <EmailCodeForm />
    </Container>
  )
}

export function OptionalLocalSignIn() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  if (!auth.configured || auth.status === "signed-in") return null
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Sign in
      </Button>
    )
  }
  return <EmailCodeForm />
}

export function AuthStatusChip() {
  const auth = useAuth()
  if (auth.status === "signed-in" && auth.email) {
    return (
      <div className="flex items-center gap-2">
        <p className="max-w-[12rem] truncate text-xs text-muted-foreground" title={auth.email}>
          {auth.email}
        </p>
        <Button variant="outline" size="sm" onClick={() => void auth.signOut()}>
          Sign out
        </Button>
      </div>
    )
  }
  if (auth.isLocalhost && auth.configured && auth.status === "signed-out") {
    return <OptionalLocalSignIn />
  }
  return null
}

"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeepCutPauseStreamer } from "@/components/keep-cut-pause-streamer"
import { TrialCopyLine } from "@/components/trial-copy"
import { SIGNIN_BRAND, SIGNIN_CONTEXT, SIGNIN_HEADLINE } from "@/lib/signin-copy"

export function LoginScreen({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? "section" : "main"
  const Heading = embedded ? "h2" : "h1"
  const auth = useAuth()
  const [email, setEmail] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function sendLink(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await auth.signInWithMagicLink(email)
    setPending(false)
    if (result.error) {
      setSentTo(null)
      setError(result.error)
      return
    }
    setSentTo(email.trim())
  }

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
      <form className="space-y-3" onSubmit={sendLink}>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@studio.example"
            className="h-10"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {sentTo ? (
          <p className="text-sm text-muted-foreground">
            Link sent to {sentTo}. Open it — even from your mail app. If nothing arrives, check spam.
          </p>
        ) : null}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>
    </Container>
  )
}

export function OptionalLocalSignIn() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  if (!auth.configured || auth.status === "signed-in") return null
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Sign in
      </Button>
    )
  }
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await auth.signInWithMagicLink(email)
        setPending(false)
        setMessage(result.error ?? `Link sent to ${email.trim()}`)
      }}
    >
      <Input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="email@studio.example"
        className="h-8 w-52"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send link"}
      </Button>
      {message ? <p className="text-[0.625rem] text-muted-foreground">{message}</p> : null}
    </form>
  )
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

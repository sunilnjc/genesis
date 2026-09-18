"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  SIGNIN_ACCESS,
  SIGNIN_ACCESS_TITLE,
  SIGNIN_ACTIONS,
  SIGNIN_BRAND,
  SIGNIN_FORM_HINT,
  SIGNIN_FORM_PENDING,
  SIGNIN_FORM_SENDING,
  SIGNIN_FORM_SENT,
  SIGNIN_FORM_SUBMIT,
  SIGNIN_FORM_TITLE,
  SIGNIN_HEADLINE,
  SIGNIN_LEDE,
  SIGNIN_PROBLEM,
  SIGNIN_PROBLEM_TITLE,
  SIGNIN_RITUAL,
  SIGNIN_RITUAL_TITLE,
  SIGNIN_ROW_LEGEND,
  SIGNIN_SPLIT,
  SIGNIN_SPLIT_TITLE,
  SIGNIN_WALKAWAY,
  SIGNIN_WALKAWAY_TITLE,
} from "@/lib/signin-copy"

export function LoginScreen({ sessionPending = false }: { sessionPending?: boolean }) {
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
    <main
      data-ritestack-signin="unsigned"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:py-12"
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22.5rem)] lg:items-start lg:gap-x-16">
        <header className="max-w-2xl space-y-3">
          <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {SIGNIN_BRAND}
          </p>
          <h1 className="font-heading text-[1.65rem] leading-tight font-medium tracking-tight text-pretty sm:text-3xl">
            {SIGNIN_HEADLINE}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{SIGNIN_LEDE}</p>
        </header>

        <aside className="mt-8 lg:col-start-2 lg:row-span-2 lg:mt-0 lg:sticky lg:top-8">
          <Card className="text-sm/relaxed">
            <CardHeader className="border-b">
              <CardTitle className="font-heading text-base">{SIGNIN_FORM_TITLE}</CardTitle>
              <CardDescription>{SIGNIN_FORM_HINT}</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionPending ? (
                <p className="mb-3 text-xs text-muted-foreground">{SIGNIN_FORM_PENDING}</p>
              ) : null}
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
                    className="h-10 text-sm"
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {sentTo ? (
                  <p className="text-sm text-muted-foreground">
                    Link sent to {sentTo}. {SIGNIN_FORM_SENT}
                  </p>
                ) : null}
                <Button type="submit" className="h-11 w-full text-sm" disabled={pending || sessionPending}>
                  {pending ? SIGNIN_FORM_SENDING : SIGNIN_FORM_SUBMIT}
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <div className="mt-10 max-w-2xl space-y-8 lg:col-start-1 lg:mt-10">
          <section className="space-y-2">
            <h2 className="font-heading text-sm font-medium">{SIGNIN_PROBLEM_TITLE}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{SIGNIN_PROBLEM}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-sm font-medium">{SIGNIN_RITUAL_TITLE}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{SIGNIN_RITUAL}</p>
            <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <p className="border-b border-foreground/10 bg-muted/40 px-3 py-2 text-[0.625rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                One decide-by row
              </p>
              <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
                {SIGNIN_ROW_LEGEND.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <ul className="grid gap-2 sm:grid-cols-3">
              {SIGNIN_ACTIONS.map((action) => (
                <li
                  key={action.name}
                  className="rounded-lg bg-card px-3 py-3 ring-1 ring-foreground/10"
                >
                  <Badge
                    variant={
                      action.name === "Cut" ? "destructive" : action.name === "Pause" ? "secondary" : "outline"
                    }
                  >
                    {action.name}
                  </Badge>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{action.meaning}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-sm font-medium">{SIGNIN_WALKAWAY_TITLE}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{SIGNIN_WALKAWAY}</p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h2 className="font-heading text-sm font-medium">{SIGNIN_SPLIT_TITLE}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{SIGNIN_SPLIT}</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-sm font-medium">{SIGNIN_ACCESS_TITLE}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{SIGNIN_ACCESS}</p>
          </section>
        </div>
      </div>
    </main>
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

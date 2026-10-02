"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function EmailCodeForm() {
  const auth = useAuth()
  const id = useId()
  const [email, setEmail] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<"send" | "verify" | null>(null)
  const [seconds, setSeconds] = useState(0)
  const busy = useRef(false)
  const coolingDown = seconds > 0

  useEffect(() => {
    if (!coolingDown) return
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [coolingDown])

  async function sendCode() {
    if (busy.current || coolingDown) return
    busy.current = true
    setPending("send")
    setError(null)
    try {
      const address = sentTo ?? email.trim()
      const result = await auth.requestSignInCode(address)
      if (result.error) {
        setError(result.error)
        return
      }
      setSentTo(address)
      setCode("")
      setSeconds(60)
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!sentTo) return sendCode()
    if (busy.current) return
    busy.current = true
    setPending("verify")
    setError(null)
    try {
      const result = await auth.verifySignInCode(sentTo, code)
      if (result.error) setError(result.error)
      // AuthProvider observes the verified session and opens the current page.
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit} aria-busy={pending !== null}>
      {sentTo ? (
        <>
          <p id={`${id}-instructions`} role="status" className="text-sm text-muted-foreground">
            Code sent to {sentTo}. Enter the code from the newest email. Check spam if it hasn’t arrived.
          </p>
          <div className="space-y-1">
            <Label htmlFor={`${id}-code`}>Verification code</Label>
            <Input id={`${id}-code`} type="text" inputMode="numeric" autoComplete="one-time-code"
              autoFocus required value={code} onChange={(event) => setCode(event.target.value)}
              disabled={pending !== null} aria-describedby={`${id}-instructions`} aria-invalid={Boolean(error)}
              className="h-11 text-base tracking-widest" placeholder="Code from your email" />
          </div>
        </>
      ) : (
        <div className="space-y-1">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input id={`${id}-email`} type="email" autoComplete="email" required value={email}
            onChange={(event) => setEmail(event.target.value)} disabled={pending !== null}
            placeholder="you@studio.example" className="h-11 text-base" />
        </div>
      )}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11 w-full" disabled={pending !== null || (!sentTo && coolingDown)}>
        {pending === "verify" ? "Verifying…" : pending === "send" ? "Sending code…" : sentTo ? "Verify and sign in" : coolingDown ? `Send code in ${seconds}s` : "Email me a sign-in code"}
      </Button>
      {sentTo ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending !== null || coolingDown} onClick={() => void sendCode()}>
            {coolingDown ? `Resend code in ${seconds}s` : "Resend code"}
          </Button>
          <Button type="button" variant="ghost" disabled={pending !== null} onClick={() => {
            setSentTo(null)
            setCode("")
            setError(null)
          }}>Use a different email</Button>
        </div>
      ) : <p className="text-xs text-muted-foreground">We’ll email you a one-time code. Enter it here to sign in.</p>}
    </form>
  )
}

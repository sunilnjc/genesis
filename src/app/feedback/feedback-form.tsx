"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FEEDBACK_TO, buildMailtoHref, validateFeedback } from "./feedback"

type FormState = "empty" | "pending" | "error" | "sent"

export function FeedbackForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [state, setState] = useState<FormState>("empty")
  const [error, setError] = useState<string | null>(null)
  const [via, setVia] = useState<"email" | "mailto" | null>(null)

  const showForm = state !== "sent"

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { name, email, message }
    const invalid = validateFeedback(payload)
    if (invalid) {
      setError(invalid)
      setState("error")
      return
    }

    setPending()
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; fallback?: string }
        | null

      if (response.ok && body?.ok && body.fallback !== "mailto") {
        setVia("email")
        setError(null)
        setState("sent")
        return
      }

      if (response.status === 400 && body?.error) {
        setError(body.error)
        setState("error")
        return
      }

      openMailto(payload)
    } catch {
      openMailto(payload)
    }
  }

  function setPending() {
    setError(null)
    setState("pending")
  }

  function openMailto(payload: { name: string; email: string; message: string }) {
    const href = buildMailtoHref(payload)
    window.location.href = href
    setVia("mailto")
    setError(null)
    setState("sent")
  }

  function reset() {
    setName("")
    setEmail("")
    setMessage("")
    setVia(null)
    setError(null)
    setState("empty")
  }

  if (!showForm) {
    return (
      <div
        data-ritestack-feedback="sent"
        data-ritestack-feedback-via={via ?? "mailto"}
        className="space-y-3"
      >
        <p className="text-sm">Sent.</p>
        <p className="text-sm text-muted-foreground">
          {via === "email"
            ? `It landed at ${FEEDBACK_TO}.`
            : `Your mail app should be open to ${FEEDBACK_TO}. If nothing appeared, write that address yourself.`}
        </p>
        <Button type="button" variant="outline" className="h-10" onClick={reset}>
          Write another
        </Button>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      data-ritestack-feedback={state}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="space-y-1">
        <Label htmlFor="feedback-name">Name</Label>
        <Input
          id="feedback-name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (state === "error") setState("empty")
          }}
          placeholder="Optional"
          className="h-10"
          maxLength={80}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="feedback-email">Email</Label>
        <Input
          id="feedback-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (state === "error") setState("empty")
          }}
          placeholder="you@studio.example"
          className="h-10"
          maxLength={200}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="feedback-message">Message</Label>
        <Textarea
          id="feedback-message"
          name="message"
          required
          value={message}
          onChange={(event) => {
            setMessage(event.target.value)
            if (state === "error") setState("empty")
          }}
          placeholder="What should change?"
          className="min-h-28"
          maxLength={4000}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" data-ritestack-feedback-error="">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full" disabled={state === "pending"}>
        {state === "pending" ? "Sending…" : "Send feedback"}
      </Button>
      <p className="text-[0.625rem] text-muted-foreground">
        Goes to {FEEDBACK_TO}. If the server can’t mail it, your mail app opens instead.
      </p>
    </form>
  )
}

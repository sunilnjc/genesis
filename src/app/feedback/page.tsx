import type { Metadata } from "next"
import Link from "next/link"
import { FeedbackForm } from "./feedback-form"

export const metadata: Metadata = {
  title: "Feedback · RiteStack",
  description: "Write hello@ritestack.app. Name is optional.",
}

export default function FeedbackPage() {
  return (
    <main
      data-ritestack-screen="feedback"
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10"
    >
      <header className="space-y-3">
        <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          RiteStack
        </p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Short note to hello@ritestack.app. Name is optional. We read it.
        </p>
      </header>

      <FeedbackForm />

      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Open the app
        </Link>
        <Link href="/about" className="underline-offset-4 hover:underline">
          About
        </Link>
      </nav>
    </main>
  )
}

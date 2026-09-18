import { friendlyAuthError } from "@/lib/auth/callback"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

type Search = Promise<{
  reason?: string
  error?: string
  error_description?: string
}>

export default async function AuthErrorPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams
  const message = friendlyAuthError(params.reason || params.error_description || params.error)

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
      <p className="text-[0.625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        RiteStack
      </p>
      <h1 className="font-heading text-xl">Sign-in didn’t finish</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild>
        <Link href="/">Back to RiteStack</Link>
      </Button>
    </main>
  )
}

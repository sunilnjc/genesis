import { deleteOwnAccount } from "@/lib/account-delete"
import { readSupabaseConfig } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function DELETE(request: Request) {
  const config = readSupabaseConfig()
  if (!config) return Response.json({ error: "Account deletion is temporarily unavailable." }, { status: 503 })
  return deleteOwnAccount(request, config)
}

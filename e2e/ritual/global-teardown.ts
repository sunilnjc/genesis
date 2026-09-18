import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { deleteRitualUsers, type RitualAccountMeta } from "./auth"

export default async function globalTeardown() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const path = resolve(dir, ".auth/account.json")
  if (!existsSync(path)) return
  const meta = JSON.parse(readFileSync(path, "utf8")) as RitualAccountMeta
  await deleteRitualUsers(meta.userId, meta.otherUserId)
  process.stdout.write("RiteStack ritual e2e: test users removed.\n")
}

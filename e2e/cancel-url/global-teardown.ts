import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { deleteCancelUrlUser, type CancelUrlAccountMeta } from "./auth"

export default async function globalTeardown() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const path = resolve(dir, ".auth/account.json")
  if (!existsSync(path)) return
  const meta = JSON.parse(readFileSync(path, "utf8")) as CancelUrlAccountMeta
  await deleteCancelUrlUser(meta.userId)
  process.stdout.write("RiteStack cancel-url e2e: test user removed.\n")
}

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { deleteTrialCopyUser, type TrialCopyAccount } from "./auth"

export default async function globalTeardown() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const path = resolve(dir, ".auth/accounts.json")
  if (!existsSync(path)) return
  const accounts = JSON.parse(readFileSync(path, "utf8")) as TrialCopyAccount[]
  for (const account of accounts) {
    await deleteTrialCopyUser(account.userId)
  }
  process.stdout.write("RiteStack trial-copy e2e: test users removed.\n")
}

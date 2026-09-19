import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createTrialCopyAccount, HOSTED, type TrialCopyKind } from "./auth"
import { playwrightAuthCookies } from "./session-cookie.ts"

const KINDS: TrialCopyKind[] = ["trial", "paid", "locked"]

export default async function globalSetup() {
  const dir = dirname(fileURLToPath(import.meta.url))
  mkdirSync(resolve(dir, ".auth"), { recursive: true })

  const accounts = []
  for (const kind of KINDS) {
    const { meta, session } = await createTrialCopyAccount(kind)
    accounts.push(meta)
    writeFileSync(
      resolve(dir, `.auth/${kind}.json`),
      `${JSON.stringify(
        {
          cookies: playwrightAuthCookies(HOSTED, meta.storageKey, session),
          origins: [
            {
              origin: HOSTED,
              localStorage: [{ name: meta.storageKey, value: JSON.stringify(session) }],
            },
          ],
        },
        null,
        2
      )}\n`
    )
    process.stdout.write(`RiteStack trial-copy e2e: ${kind} user minted (magic link, no inbox).\n`)
  }

  writeFileSync(resolve(dir, ".auth/accounts.json"), `${JSON.stringify(accounts, null, 2)}\n`)
}

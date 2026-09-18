import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createCancelUrlAccount, HOSTED, probeLookup } from "./auth"
import { playwrightAuthCookies } from "./session-cookie.ts"

export default async function globalSetup() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const probe = await probeLookup(HOSTED)
  mkdirSync(resolve(dir, ".auth"), { recursive: true })
  writeFileSync(resolve(dir, ".auth/probe.json"), `${JSON.stringify(probe, null, 2)}\n`)
  process.stdout.write(
    probe.live
      ? `RiteStack cancel-url e2e: lookup live at ${probe.path} (${probe.status}).\n`
      : `RiteStack cancel-url e2e: lookup NOT live (${probe.path} → ${probe.status} ${probe.contentType}).\n`
  )

  const { meta, session } = await createCancelUrlAccount()
  writeFileSync(resolve(dir, ".auth/account.json"), `${JSON.stringify(meta, null, 2)}\n`)
  writeFileSync(
    resolve(dir, ".auth/state.json"),
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
  process.stdout.write("RiteStack cancel-url e2e: test user minted (magic link, no inbox).\n")
}


import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createRitualAccount } from "./auth"

export default async function globalSetup() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const { meta, session } = await createRitualAccount()
  mkdirSync(resolve(dir, ".auth"), { recursive: true })
  writeFileSync(resolve(dir, ".auth/account.json"), `${JSON.stringify(meta, null, 2)}\n`)
  writeFileSync(
    resolve(dir, ".auth/state.json"),
    `${JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin: "https://ritestack.app",
            localStorage: [{ name: meta.storageKey, value: JSON.stringify(session) }],
          },
        ],
      },
      null,
      2
    )}\n`
  )
  process.stdout.write("RiteStack ritual e2e: test users minted (magic link, no inbox).\n")
}

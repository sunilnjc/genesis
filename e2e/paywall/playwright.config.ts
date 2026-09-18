import { defineConfig, devices } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "../..")
const PORT = Number(process.env.PAYWALL_E2E_PORT ?? 4377)
const baseURL = process.env.PAYWALL_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`

function readDotEnv(file: string) {
  const env: Record<string, string> = {}
  if (!fs.existsSync(file)) return env
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return env
}

/** Local founder ritual + Stripe Checkout. Blank inherited Supabase so we never send magic links. */
function e2eServerEnv() {
  const env = { ...process.env } as Record<string, string | undefined>
  const local = readDotEnv(path.join(repoRoot, ".env.local"))
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "STRIPE_WEBHOOK_SECRET"]) {
    if (local[key]) env[key] = local[key]
  }
  env.NEXT_PUBLIC_APP_URL = `http://127.0.0.1:${PORT}`
  // Playwright merges this onto process.env — omitted keys stay set. Force empty.
  env.NEXT_PUBLIC_SUPABASE_URL = ""
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
  env.SUPABASE_SERVICE_ROLE_KEY = ""
  env.SUPABASE_URL = ""
  env.SUPABASE_ANON_KEY = ""
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  )
}

/**
 * RiteStack trial + $14 paywall E2E. Isolated from other e2e slices.
 *
 *   cd e2e/paywall && npm test
 *
 * Local Next on :4377 (not 4317). Stripe test mode. No magic-link mail.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `rm -rf .next && env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY -u SUPABASE_SERVICE_ROLE_KEY -u SUPABASE_URL -u SUPABASE_ANON_KEY npx next dev --port ${PORT} --hostname 127.0.0.1`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: e2eServerEnv(),
  },
})

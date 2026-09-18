import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "../..")
const PORT = Number(process.env.PAYWALL_E2E_PORT ?? 4377)
const baseURL = process.env.PAYWALL_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`

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
    command: `npx next dev --port ${PORT} --hostname 127.0.0.1`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

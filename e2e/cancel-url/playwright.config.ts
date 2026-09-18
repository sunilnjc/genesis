import { defineConfig, devices } from "@playwright/test"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const baseURL = (process.env.RITESTACK_E2E_BASE_URL ?? "https://ritestack.app").replace(
  /\/$/,
  ""
)

/**
 * Signed-in add-form cancel URL fill against hosted RiteStack.
 * Own slice — do not point this config at other e2e folders.
 */
export default defineConfig({
  testDir: dir,
  testMatch: /cancel-url\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: resolve(dir, "playwright-report"), open: "never" }],
  ],
  globalSetup: resolve(dir, "global-setup.ts"),
  globalTeardown: resolve(dir, "global-teardown.ts"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1280, height: 800 },
    storageState: resolve(dir, ".auth/state.json"),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
  outputDir: resolve(dir, "test-results"),
})

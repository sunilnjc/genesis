import { defineConfig, devices } from "@playwright/test"

const baseURL = (process.env.RITESTACK_E2E_BASE_URL ?? "https://ritestack.app").replace(/\/$/, "")

export default defineConfig({
  testDir: ".",
  testMatch: /isolation\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
})

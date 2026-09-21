import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: ".", outputDir: "../../test-results/cuts", testMatch: /cuts\.spec\.ts/, workers: 1, retries: 0,
  timeout: 90_000, expect: { timeout: 20_000 }, reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: process.env.RITESTACK_E2E_BASE_URL ?? "http://127.0.0.1:4327", headless: true, trace: "off" },
})

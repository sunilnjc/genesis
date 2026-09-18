import { defineConfig, devices } from "@playwright/test"

const hostedBaseURL = process.env.RITESTACK_BASE_URL ?? "https://ritestack.app"

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: hostedBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    storageState: { cookies: [], origins: [] },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
      },
    },
  ],
})

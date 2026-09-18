import { expect, test, type Page } from "@playwright/test"

/** Founder notebook — must never appear for an unsigned hosted visitor. */
const FOUNDER_SEED = [
  "OpenAI Pro+",
  "Cursor Pro",
  "Claude",
  "Cloudflare workers",
  "Twitter (X)",
  "CoinGecko",
  "$445",
  "$200",
] as const

const FORBIDDEN_STORY = [
  "The problem",
  "The ritual",
  "What you walk away with",
  "Decide is not Inventory",
  "Seven days, then $14 once",
  "You don’t miss the cancel button",
] as const

const PATHS = ["/", "/inventory"] as const

async function openUnsigned(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(page.locator('[data-ritestack-signin="unsigned"]')).toBeVisible()
}

async function assertMagicLinkForm(page: Page) {
  const form = page.locator("main[data-ritestack-signin='unsigned'] form")
  await expect(form).toBeVisible()
  await expect(form.locator("#email")).toBeVisible()
  await expect(form.locator("#email")).toHaveAttribute("type", "email")
  await expect(form.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
}

async function assertEmptyNoSeed(page: Page) {
  const main = page.locator("main[data-ritestack-signin='unsigned']")
  await expect(main).toBeVisible()
  await expect(page.locator("[data-ritestack-user-id]")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Sign in to your stack" })).toBeVisible()
  await expect(page.getByText("the AI and dev tools you pay for.")).toBeVisible()

  const body = await page.locator("body").innerText()
  for (const seed of FOUNDER_SEED) {
    expect(body, `unsigned page leaked founder seed: ${seed}`).not.toContain(seed)
  }
  for (const story of FORBIDDEN_STORY) {
    expect(body, `unsigned page leaked long story: ${story}`).not.toContain(story)
  }

  await expect(page.getByText("Checking session…")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Add a tool you pay for" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Inventory" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Decide" })).toHaveCount(0)
}

async function assertStreamerThenSettled(page: Page) {
  const streamer = page.locator('[data-ritestack-streamer="keep-cut-pause"]')
  await expect(streamer).toBeVisible()
  await expect(streamer).toHaveAttribute("data-cycle", "keep,cut,pause")
  await expect(streamer).toHaveAttribute("data-settled", "false")
  await expect(streamer.locator(".ritestack-caret")).toHaveCount(1)

  await expect(streamer).toHaveText("keep", { timeout: 5_000 })
  await expect(streamer).toHaveText("cut", { timeout: 10_000 })
  await expect(streamer).toHaveText("pause", { timeout: 10_000 })
  await expect(streamer).toHaveAttribute("data-settled", "true", { timeout: 8_000 })
  await expect(streamer).toHaveText("keep / cut / pause")
  await expect(streamer.locator(".ritestack-caret")).toHaveCount(0)
}

for (const path of PATHS) {
  test(`unsigned ${path} is an empty login wall with magic link and streamer`, async ({ page }) => {
    await openUnsigned(page, path)
    await assertEmptyNoSeed(page)
    await assertMagicLinkForm(page)
    await assertStreamerThenSettled(page)
  })
}

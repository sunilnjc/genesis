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
  await expect(page.locator('[data-ritestack-trial-copy="unsigned"]')).toBeVisible()
  await expect(
    page.getByText("7 days full ritual after sign-in. Then $14 once. Looking at your stack stays free.")
  ).toBeVisible()

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

async function assertSiteFooter(page: Page) {
  const footer = page.locator('[data-ritestack-footer="site"]')
  await expect(footer).toBeVisible()
  await expect(footer.getByText("© 2026 RiteStack")).toBeVisible()
  await expect(footer.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about")
  await expect(footer.getByRole("link", { name: "Feedback" })).toHaveAttribute("href", "/feedback")
  await expect(footer.getByRole("link", { name: "Brief" })).toHaveAttribute("href", "/brief")
  await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms")
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy")
  await expect(footer.getByRole("link", { name: "Refund" })).toHaveAttribute("href", "/refund")
  await expect(footer.getByText(/subscription/i)).toHaveCount(0)
}

async function assertStreamerLoops(page: Page) {
  const streamer = page.locator('[data-ritestack-streamer="keep-cut-pause"]')
  const headline = page.getByRole("heading", { name: "Sign in to your stack" })
  await expect(streamer).toBeVisible()
  await expect(streamer).toHaveAttribute("data-cycle", "keep,cut,pause")
  await expect(streamer).toHaveAttribute("data-loop", "true")
  await expect(streamer).not.toHaveAttribute("data-settled")
  await expect(streamer).toHaveClass(/text-base/)
  await expect(streamer).not.toHaveClass(/text-2xl/)
  await expect(streamer.locator(".ritestack-caret")).toHaveCount(1)

  const streamerPx = await streamer.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))
  const headlinePx = await headline.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))
  expect(streamerPx, "streamer type should be smaller than the headline").toBeLessThan(headlinePx)

  await expect(streamer).toHaveText("keep", { timeout: 5_000 })
  await expect(streamer).toHaveText("cut", { timeout: 10_000 })
  await expect(streamer).toHaveText("pause", { timeout: 10_000 })
  await expect(streamer).toHaveText("keep", { timeout: 12_000 })

  await expect(streamer).toHaveAttribute("data-loop", "true")
  await expect(streamer).not.toHaveAttribute("data-settled")
  await expect(streamer).not.toHaveText("keep / cut / pause")
  await expect(streamer.locator(".ritestack-caret")).toHaveCount(1)
}

for (const path of PATHS) {
  test(`unsigned ${path} is an empty login wall with magic link and looping streamer`, async ({ page }) => {
    await openUnsigned(page, path)
    await assertEmptyNoSeed(page)
    await assertMagicLinkForm(page)
    await assertSiteFooter(page)
    await assertStreamerLoops(page)
  })
}

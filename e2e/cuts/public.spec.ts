import { expect, test } from "@playwright/test"

test("public product and pricing are readable without JavaScript or a session", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  const response = await page.goto(baseURL!, { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "Know what stays. Decide what goes." })).toBeVisible()
  await expect(page.getByRole("heading", { name: "The RiteStack ritual · $14 once" })).toBeVisible()
  for (const href of ["/terms", "/privacy", "/refund", "mailto:hello@ritestack.app"]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible()
  }
  await expect(page.locator('[data-list]')).toHaveCount(0)
  await context.close()
})

test("mobile visitors can read the offer and sign in without overflow", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL!, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Know what stays. Decide what goes." })).toBeVisible()
  await page.getByRole("link", { name: "Sign in", exact: true }).click()
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: "/tmp/ritestack-public-mobile.png", fullPage: true })
})

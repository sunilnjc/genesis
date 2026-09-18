import { expect, type Page } from "@playwright/test"

export const FORBIDDEN_PRODUCTS = /\b(gmail|plaid|linkedin)\b/i
export const TEST_CARD = "4242424242424242"
export const E2E_EMAIL = "ritestack.e2e.paywall@example.com"

export const trialStatus = {
  viewList: true as const,
  ritual: true,
  state: "trial" as const,
  trialEndsAt: "2099-09-26T00:00:00.000Z",
  packPaidAt: null,
  daysLeft: 7,
  checkoutEnabled: true,
  userId: "e2e-trial-user",
  checkoutConfigured: true,
  supabaseConfigured: true,
  message: "Trial · 7 days left. Keep / cut / pause stays unlocked.",
}

export const day8PaywallStatus = {
  viewList: true as const,
  ritual: false,
  state: "paywall" as const,
  trialEndsAt: "2026-09-11T00:00:00.000Z",
  packPaidAt: null,
  daysLeft: 0,
  checkoutEnabled: true,
  userId: "e2e-paywall-user",
  checkoutConfigured: true,
  supabaseConfigured: true,
  message:
    "Trial ended. Your list stays free. Unlock keep / cut / pause, cancel URLs, and reminders for $14 once.",
}

export async function mockBillingStatus(page: Page, body: object) {
  await page.route("**/api/billing/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

export async function waitForApp(page: Page) {
  await expect(page.getByText("Checking session…")).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator("[data-view]")).toBeVisible()
}

export function visibleTab(page: Page, name: RegExp) {
  return page.getByRole("tab", { name }).filter({ visible: true })
}

export async function expectNoInventedIntegrations(page: Page) {
  const text = await page.locator("body").innerText()
  expect(text).not.toMatch(FORBIDDEN_PRODUCTS)
}

export async function expectRitualUnlocked(page: Page) {
  await expect(page.getByRole("button", { name: /^keep$/i }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /^cut$/i }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /^pause$/i }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: /cancel url/i }).first()).toBeVisible()
  await expect(page.getByText("Cancel URL locked")).toHaveCount(0)
  await expect(page.getByText("Unlock keep / cut / pause", { exact: true })).toHaveCount(0)
}

export async function expectRitualLocked(page: Page) {
  await expect(page.getByRole("button", { name: /^keep$/i })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^cut$/i })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^pause$/i })).toHaveCount(0)
  await expect(page.getByText("Cancel URL locked").filter({ visible: true }).first()).toBeVisible()
}

export async function expectInventoryFree(page: Page) {
  await expect(page.getByText("Monthly burn", { exact: true })).toBeVisible()
  await expect(page.getByText("Decide-by", { exact: true })).toBeVisible()
  await expect(page.locator('[data-list="inventory"]')).toBeVisible()
  await expect(page.getByRole("button", { name: /add subscription/i }).filter({ visible: true })).toBeVisible()
}

export function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first()
}

export async function completeStripeTestCard(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 })

  const email = page.locator("#email, input[name='email'], input[type='email']").first()
  await email.waitFor({ state: "visible", timeout: 25_000 })
  await email.fill(E2E_EMAIL)

  const cardTab = page.getByRole("tab", { name: /^card$/i })
  if (await cardTab.isVisible().catch(() => false)) {
    await cardTab.click()
  }

  const payWithCard = page.getByRole("button", { name: /pay with card|use another card|card/i })
  if (await payWithCard.first().isVisible().catch(() => false)) {
    await payWithCard.first().click()
  }

  const cardNumber = page.locator("#cardNumber, input[name='cardNumber']").first()
  await cardNumber.waitFor({ state: "visible", timeout: 25_000 })
  await cardNumber.click()
  await cardNumber.fill(TEST_CARD)

  const expiry = page.locator("#cardExpiry, input[name='cardExpiry']").first()
  await expiry.fill("1234")

  const cvc = page.locator("#cardCvc, input[name='cardCvc']").first()
  await cvc.fill("123")

  const name = page.locator("#billingName, input[name='billingName']").first()
  if (await name.isVisible().catch(() => false)) {
    await name.fill("RiteStack E2E")
  }

  const zip = page.locator("#billingPostalCode, input[name='billingPostalCode']").first()
  if (await zip.isVisible().catch(() => false)) {
    await zip.fill("94107")
  }

  const pay = page.getByRole("button", { name: /pay(\s|$)|\bunlock\b/i }).first()
  await expect(pay).toBeEnabled({ timeout: 15_000 })
  await pay.click()

  await page.waitForURL(/127\.0\.0\.1:4377/, { timeout: 90_000 })
}

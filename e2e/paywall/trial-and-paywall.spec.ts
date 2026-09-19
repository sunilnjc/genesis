import { expect, test } from "@playwright/test"
import {
  day8PaywallStatus,
  expectInventoryFree,
  expectNoInventedIntegrations,
  expectRitualLocked,
  expectRitualUnlocked,
  mockBillingStatus,
  trialStatus,
  visibleText,
  waitForApp,
} from "./helpers"

test.describe("7-day ritual trial then day-8 paywall", () => {
  test("preview=trial keeps keep/cut/pause, cancel URLs, and reminders unlocked", async ({
    page,
  }) => {
    await page.goto("/?preview=trial")
    await waitForApp(page)

    await expect(page.locator('[data-ritestack-trial-copy="signed-in"]').first()).toBeVisible()
    await expect(page.getByText(/7 days full ritual after sign-in/i).first()).toBeVisible()
    await expect(page.getByText(/\$14 once/i).first()).toBeVisible()
    await expectRitualUnlocked(page)
    await expect(page.getByText("Unlock keep / cut / pause", { exact: true })).toHaveCount(0)
    await expectNoInventedIntegrations(page)
  })

  test("mocked signed-in trial (day 1–7) is full ritual after signup", async ({ page }) => {
    await mockBillingStatus(page, trialStatus)
    await page.goto("/")
    await waitForApp(page)

    await expect(page.locator('[data-ritestack-trial-copy="signed-in"]').first()).toBeVisible()
    await expect(page.getByText(/7 days full ritual after sign-in/i).first()).toBeVisible()
    await expect(page.getByText(/\$14 once/i).first()).toBeVisible()
    await expect(page.getByText(/7 days left/i).first()).toBeVisible()
    await expectRitualUnlocked(page)
    await expect(page.getByRole("button", { name: /^pause$/i }).first()).toBeVisible()
    await expectNoInventedIntegrations(page)
  })

  test("day-8 Decide locks keep/cut/pause, cancel URLs, and reminders until $14", async ({
    page,
  }) => {
    await page.goto("/?preview=paywall")
    await waitForApp(page)

    await expect(page.getByText("Unlock keep / cut / pause", { exact: true })).toBeVisible()
    await expect(
      page.getByText(/inventory stays free.*reminders/i)
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /unlock ritestack pack · \$14/i })).toBeVisible()
    await expectRitualLocked(page)
    await expect(page.locator('[data-list="decide-by"]')).toBeVisible()
    await expect(page.getByText("Locked", { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expectNoInventedIntegrations(page)
  })

  test("day-8 Inventory / burn / queue viewing stay free", async ({ page }) => {
    await page.goto("/inventory?preview=paywall")
    await waitForApp(page)

    await expect(page.getByText("Ritual locked")).toBeVisible()
    await expectInventoryFree(page)
    await expect(visibleText(page, "OpenAI")).toBeVisible()
    await expect(visibleText(page, "Cancel URL locked")).toBeVisible()
    await expect(page.getByRole("button", { name: /^keep$/i })).toHaveCount(0)

    await page.getByRole("button", { name: /add subscription/i }).filter({ visible: true }).click()
    await page.locator("#sub-name").fill("E2E Paywall Free Add")
    await page.locator("#sub-cost").fill("9")
    await page.getByRole("button", { name: /add to list/i }).click()
    await expect(page.getByRole("table").getByText("E2E Paywall Free Add")).toBeVisible()
    await expect(page.getByText("Monthly burn", { exact: true })).toBeVisible()
    await expectNoInventedIntegrations(page)
  })

  test("mocked day-8 signed-in paywall matches preview lock", async ({ page }) => {
    await mockBillingStatus(page, day8PaywallStatus)
    await page.goto("/")
    await waitForApp(page)

    await expect(page.getByText("Unlock keep / cut / pause", { exact: true })).toBeVisible()
    await expect(page.getByText(/trial ended/i)).toBeVisible()
    await expectRitualLocked(page)

    await page.goto("/inventory")
    await waitForApp(page)
    await expectInventoryFree(page)
    await expect(page.getByText("Ritual locked")).toBeVisible()
  })
})

/**
 * Hosted product-claim tests for weekend pricing copy.
 * Lock: genesis-weekend-launch.md §7 —
 * “7 days full ritual. Then $14 once. Looking at your stack stays free.”
 * Fail if that claim is missing from the UI, or if paid still talks like unpaid.
 */
import { expect, test, type Locator, type Page } from "@playwright/test"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

const FULL_RITUAL = /7 days full ritual/i
const FOURTEEN_ONCE = /\$14 once/i
const LOOKING_OR_INVENTORY_FREE =
  /looking at (your )?stack stays free|inventory(?:\/looking)? stays free|looking stays free/i
const UNLOCK_FOURTEEN = /unlock(?:[^.\n]{0,40})?\$14/i
const SUBSCRIPTION = /\bsubscription\b/i
const REMAINING_DAYS = /\b(?:[1-7] days? left|7 days)\b/i

async function visibleBody(page: Page) {
  return page.locator("body").innerText()
}

function trialCopyLine(root: Locator | Page, surface: "unsigned" | "signed-in") {
  const attr = root.locator(`[data-ritestack-trial-copy="${surface}"]`)
  const text = root.getByText(FULL_RITUAL)
  return attr.or(text).first()
}

async function waitUnsigned(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(page.locator('[data-ritestack-signin="unsigned"]')).toBeVisible()
  await expect(page.getByText("Checking session…")).toHaveCount(0)
}

async function waitSignedIn(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Sign in to your stack" })).toHaveCount(0)
  await expect(page.locator("[data-ritestack-user-id]")).toBeVisible()
  await expect(page.getByText("Checking session…")).toHaveCount(0)
  await expect(page.getByText("Loading your list…")).toHaveCount(0)
  await expect(page.locator("[data-view]")).toBeVisible()
}

test.describe("unsigned login", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const path of ["/", "/inventory"] as const) {
    test(`${path} mentions 7 days full ritual and $14 once, not a subscription`, async ({
      page,
    }) => {
      await waitUnsigned(page, path)

      const login = page.locator('main[data-ritestack-signin="unsigned"]')
      const line = trialCopyLine(login, "unsigned")
      await expect(line, "unsigned login is missing 7 days full ritual").toBeVisible()
      await expect(line).toContainText(FULL_RITUAL)
      await expect(line).toContainText(FOURTEEN_ONCE)
      await expect(line).toContainText(LOOKING_OR_INVENTORY_FREE)

      const text = await line.innerText()
      expect(text, "unsigned trial copy must not say subscription").not.toMatch(SUBSCRIPTION)
      expect(text, "unsigned trial copy must not say pro plan").not.toMatch(/pro plan/i)

      const body = await visibleBody(page)
      expect(body).toMatch(FULL_RITUAL)
      expect(body).toMatch(FOURTEEN_ONCE)
    })
  }
})

test.describe("signed-in trial", () => {
  test.use({ storageState: resolve(here, ".auth/trial.json") })

  for (const path of ["/", "/inventory"] as const) {
    test(`${path} shows 7 days / remaining-days, $14 once, looking stays free`, async ({
      page,
    }) => {
      await waitSignedIn(page, path)

      const line = trialCopyLine(page, "signed-in")
      await expect(line, "signed-in trial is missing 7 days / $14 once copy").toBeVisible()
      await expect(line).toContainText(FULL_RITUAL)
      await expect(line).toContainText(FOURTEEN_ONCE)
      await expect(line).toContainText(LOOKING_OR_INVENTORY_FREE)
      await expect(line).toContainText(REMAINING_DAYS)

      const remaining = page.locator("[data-ritestack-trial-remaining]")
      if ((await remaining.count()) > 0) {
        await expect(remaining.first()).toBeVisible()
        await expect(remaining.first()).toContainText(/\d+ days? left/i)
      }

      const text = await line.innerText()
      expect(text).not.toMatch(SUBSCRIPTION)
    })
  }
})

test.describe("paid pack", () => {
  test.use({ storageState: resolve(here, ".auth/paid.json") })

  for (const path of ["/", "/inventory"] as const) {
    test(`${path} does not still say 7 days full ritual as if unpaid`, async ({ page }) => {
      await waitSignedIn(page, path)

      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible()
      await expect(page.locator('[data-ritestack-signin="unsigned"]')).toHaveCount(0)

      const unpaidLine = page.locator('[data-ritestack-trial-copy="signed-in"]')
      if ((await unpaidLine.count()) > 0) {
        await expect(unpaidLine.first()).not.toContainText(FULL_RITUAL)
      }

      const body = await visibleBody(page)
      expect(body, "paid UI still claims 7 days full ritual as if unpaid").not.toMatch(
        FULL_RITUAL
      )
      await expect(page.getByRole("button", { name: UNLOCK_FOURTEEN })).toHaveCount(0)
    })
  }
})

test.describe("day-8 locked", () => {
  test.use({ storageState: resolve(here, ".auth/locked.json") })

  test("Decide shows Unlock $14, not a silent missing paywall", async ({ page }) => {
    await waitSignedIn(page, "/")

    const unlock = page.getByRole("button", { name: UNLOCK_FOURTEEN })
    const unlockText = page.getByText(UNLOCK_FOURTEEN)
    await expect(
      unlock.or(unlockText).first(),
      "day-8 Decide is missing Unlock $14"
    ).toBeVisible()
    await expect(page.getByText(/unlock keep \/ cut \/ pause/i).first()).toBeVisible()
  })

  test("Inventory is not a silent missing paywall", async ({ page }) => {
    await waitSignedIn(page, "/inventory")

    const body = await visibleBody(page)
    expect(body, "day-8 inventory must still mention $14").toMatch(/\$14/)
    const unlock = page.getByRole("button", { name: UNLOCK_FOURTEEN })
    const lockedBanner = page.getByText(/ritual locked|unlock keep \/ cut \/ pause/i)
    await expect(
      unlock.or(lockedBanner).or(page.getByText(UNLOCK_FOURTEEN)).first(),
      "day-8 inventory hid the paywall"
    ).toBeVisible()
  })
})

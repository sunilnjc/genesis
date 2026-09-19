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
  /looking at (your )?stack stays free|inventory stays free|looking stays free/i
const UNLOCK_FOURTEEN = /unlock(?:[^.\n]{0,60})?\$14/i
const PRO_PLAN_OR_LIFETIME = /pro plan|lifetime everything|lifetime pass/i
const DAYS_LEFT = /\b[1-7] days? left\b/i

async function visibleBody(page: Page) {
  return page.locator("body").innerText()
}

function trialCopyLine(root: Locator | Page, surface: "unsigned" | "signed-in") {
  return root.locator(`[data-ritestack-trial-copy="${surface}"]`).filter({ visible: true }).first()
}

async function waitUnsigned(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(page.locator('[data-ritestack-signin="unsigned"]')).toBeVisible()
  await expect(page.getByText("Checking session…")).toHaveCount(0)
}

async function waitSignedIn(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Sign in to your stack" })).toHaveCount(0)
  await expect(page.locator("[data-ritestack-user-id]")).toHaveAttribute(
    "data-ritestack-user-id",
    /[0-9a-f-]{8,}/i
  )
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible()
  await expect(page.getByText("Checking session…")).toHaveCount(0)
  await expect(page.getByText("Loading your list…")).toHaveCount(0)
  await expect(page.locator("[data-view]")).toBeVisible()
}

async function assertSiteChrome(page: Page) {
  const footer = page.locator('[data-ritestack-footer="site"]')
  await expect(footer).toBeVisible()
  await expect(footer.getByText("© 2026 RiteStack")).toBeVisible()
  await expect(footer.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about")
  await expect(footer.getByRole("link", { name: "Feedback" })).toHaveAttribute("href", "/feedback")
  await expect(footer.getByRole("link", { name: "Brief" })).toHaveAttribute("href", "/brief")
}

async function assertLockedPackLine(line: Locator) {
  await expect(line, "missing locked §7 trial copy").toBeVisible()
  await expect(line).toContainText(FULL_RITUAL)
  await expect(line).toContainText(FOURTEEN_ONCE)
  await expect(line).toContainText(LOOKING_OR_INVENTORY_FREE)
  const text = await line.innerText()
  expect(text, "pack copy must not sell a subscription").not.toMatch(/\bsubscription\b/i)
  expect(text).not.toMatch(PRO_PLAN_OR_LIFETIME)
}

test.describe("unsigned login", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const path of ["/", "/inventory"] as const) {
    test(`${path} mentions 7 days full ritual and $14 once, not a subscription`, async ({
      page,
    }) => {
      await waitUnsigned(page, path)
      await assertLockedPackLine(trialCopyLine(page, "unsigned"))
      await expect(page.locator("[data-ritestack-trial-remaining]")).toHaveCount(0)
    })
  }
})

test.describe("site chrome", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("/about carries the locked $14 once line", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-ritestack-screen="about"]')).toBeVisible()
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible()
    const pricing = page.locator('[data-ritestack-copy="pricing"]')
    await expect(pricing).toContainText(FULL_RITUAL)
    await expect(pricing).toContainText(FOURTEEN_ONCE)
    await expect(pricing).toContainText(LOOKING_OR_INVENTORY_FREE)
    await assertSiteChrome(page)
  })

  test("/brief is Brief, not a whitepaper, and states 7 days then $14 once", async ({ page }) => {
    await page.goto("/brief", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-ritestack-screen="brief"]')).toBeVisible()
    await expect(page.getByRole("heading", { name: "Brief" })).toBeVisible()
    await expect(page.getByText(/whitepaper/i)).toHaveCount(0)
    const body = await visibleBody(page)
    expect(body).toMatch(FULL_RITUAL)
    expect(body).toMatch(FOURTEEN_ONCE)
    expect(body).toMatch(LOOKING_OR_INVENTORY_FREE)
    await assertSiteChrome(page)
  })

  test("Feedback form can be submitted", async ({ page }) => {
    await page.addInitScript(() => {
      const desc = Object.getOwnPropertyDescriptor(Location.prototype, "href")
      if (!desc?.set) return
      Object.defineProperty(Location.prototype, "href", {
        configurable: true,
        get: desc.get,
        set(value: string) {
          if (String(value).startsWith("mailto:")) {
            document.documentElement.setAttribute("data-ritestack-mailto", String(value))
            return
          }
          desc.set?.call(this, value)
        },
      })
    })
    await page.goto("/feedback", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-ritestack-screen="feedback"]')).toBeVisible()
    await expect(page.getByRole("heading", { name: "Feedback" })).toBeVisible()
    await page.locator("#feedback-name").fill("Trial copy e2e")
    await page.locator("#feedback-email").fill("e2e-feedback@example.invalid")
    await page.locator("#feedback-message").fill("Does the feedback form actually submit?")
    await page.getByRole("button", { name: "Send feedback" }).click()
    await expect(page.locator('[data-ritestack-feedback="sent"]')).toBeVisible()
    await expect(page.getByText(/^Sent\.$/)).toBeVisible()
    await assertSiteChrome(page)
  })
})

test.describe("empty signed-in trial", () => {
  test.use({ storageState: resolve(here, ".auth/trial.json") })

  for (const path of ["/", "/inventory"] as const) {
    test(`${path} shows remaining-days label, $14 once, looking stays free`, async ({ page }) => {
      await waitSignedIn(page, path)

      const line = trialCopyLine(page, "signed-in")
      await assertLockedPackLine(line)
      await expect(line).toContainText(DAYS_LEFT)
      await expect(line).toHaveAttribute("data-ritestack-trial-days", /[1-7]/)
      const remaining = page.locator("[data-ritestack-trial-remaining]").filter({ visible: true }).first()
      await expect(remaining, "remaining-days label missing").toBeVisible()
      await expect(remaining).toContainText(DAYS_LEFT)

      if (path === "/") {
        await expect(page.getByText("Nothing to decide")).toBeVisible()
      } else {
        await expect(page.getByText("No tools on the list yet")).toBeVisible()
      }
      await expect(page.getByRole("button", { name: UNLOCK_FOURTEEN })).toHaveCount(0)
    })
  }
})

test.describe("empty signed-in paid", () => {
  test.use({ storageState: resolve(here, ".auth/paid.json") })

  for (const path of ["/", "/inventory"] as const) {
    test(`${path} is empty paid, not still promising 7 days as if unpaid`, async ({ page }) => {
      await waitSignedIn(page, path)
      await expect(page.locator('[data-ritestack-signin="unsigned"]')).toHaveCount(0)

      if (path === "/") {
        await expect(page.getByText("Nothing to decide")).toBeVisible()
      } else {
        await expect(page.getByText("No tools on the list yet")).toBeVisible()
      }

      await expect(page.locator("[data-ritestack-trial-remaining]")).toHaveCount(0)
      await expect(page.locator("[data-ritestack-trial-days]")).toHaveCount(0)
      await expect(page.getByText(DAYS_LEFT)).toHaveCount(0)
      await expect(page.getByRole("button", { name: UNLOCK_FOURTEEN })).toHaveCount(0)

      const body = await visibleBody(page)
      expect(body, "paid empty list still claims 7 days full ritual as if unpaid").not.toMatch(
        FULL_RITUAL
      )
    })
  }
})

test.describe("day-8 locked copy", () => {
  test.use({ storageState: resolve(here, ".auth/locked.json") })

  test("Decide lock copy reuses $14 once, stays free, Unlock $14 — not a silent paywall", async ({
    page,
  }) => {
    await waitSignedIn(page, "/")

    const unlock = page.getByRole("button", { name: UNLOCK_FOURTEEN })
    await expect(unlock, "day-8 Decide is missing Unlock $14").toBeVisible()
    await expect(page.getByText(/unlock keep \/ cut \/ pause/i).first()).toBeVisible()

    const body = await visibleBody(page)
    expect(body).toMatch(FOURTEEN_ONCE)
    expect(body).toMatch(LOOKING_OR_INVENTORY_FREE)
    expect(body).not.toMatch(PRO_PLAN_OR_LIFETIME)
    expect(body).not.toMatch(/\bpro plan\b/i)
    expect(body).not.toMatch(DAYS_LEFT)
    await expect(page.locator("[data-ritestack-trial-remaining]")).toHaveCount(0)
  })

  test("Inventory lock copy keeps looking free and is not silent", async ({ page }) => {
    await waitSignedIn(page, "/inventory")

    await expect(page.getByText(/ritual locked/i).first()).toBeVisible()
    const body = await visibleBody(page)
    expect(body, "day-8 inventory must still mention $14").toMatch(/\$14/)
    expect(body).toMatch(/stays free|list stays free/i)
    expect(body).not.toMatch(PRO_PLAN_OR_LIFETIME)
    expect(body).not.toMatch(DAYS_LEFT)
    await expect(page.getByText("No tools on the list yet")).toBeVisible()
  })
})

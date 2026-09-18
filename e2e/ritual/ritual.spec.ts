import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { RitualAccountMeta } from "./auth"

const here = dirname(fileURLToPath(import.meta.url))
const meta = JSON.parse(readFileSync(resolve(here, ".auth/account.json"), "utf8")) as RitualAccountMeta

const FOUNDER_LEAKS = ["OpenAI Pro+", "CoinGecko", "Twitter (X)"]
const KEEP = `E2E Keep ${meta.stamp}`
const PAUSE = `E2E Pause ${meta.stamp}`
const CUT = `E2E Cut ${meta.stamp}`
const CANCEL = {
  keep: "https://example.com/cancel/keep",
  pause: "https://example.com/cancel/pause",
  cut: "https://example.com/cancel/cut",
}

function renewDatePlus(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

async function waitForSignedIn(page: Page) {
  await expect(page.getByRole("heading", { name: "Sign in to your stack" })).toHaveCount(0)
  await expect(page.locator("[data-ritestack-user-id]")).toHaveAttribute(
    "data-ritestack-user-id",
    meta.userId
  )
  await expect(page.getByText("Checking session…")).toHaveCount(0)
  await expect(page.getByText("Loading your list…")).toHaveCount(0)
}

async function assertOnlyOwnRows(page: Page) {
  await expect(page.getByText(meta.secretName)).toHaveCount(0)
  for (const name of FOUNDER_LEAKS) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByText("$445")).toHaveCount(0)
}

async function addTool(
  page: Page,
  input: { name: string; cost: string; cancelUrl: string }
) {
  await page.getByRole("button", { name: /Add (a )?subscription/i }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.locator("#sub-name").fill(input.name)
  await dialog.locator("#sub-cost").fill(input.cost)
  await dialog.locator("#sub-renew").fill(renewDatePlus(7))
  await dialog.locator("#sub-cancel").fill(input.cancelUrl)
  await dialog.getByRole("button", { name: "Add to list" }).click()
  await expect(dialog).toBeHidden()
  await expect(inventoryRow(page, input.name)).toBeVisible()
}

function statsStrip(page: Page) {
  return page.locator("section.grid").filter({ hasText: "Monthly burn" })
}

function inventoryRow(page: Page, toolName: string) {
  return page.locator("[data-list='inventory'] table tr", { hasText: toolName })
}

function decideRow(page: Page, toolName: string) {
  return page.locator("[data-list='decide-by'] table tr", { hasText: toolName })
}

async function decideOn(page: Page, toolName: string, action: "Keep" | "Pause" | "Cut") {
  const row = decideRow(page, toolName)
  await expect(row).toBeVisible()
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/subscriptions") &&
      response.request().method() !== "GET" &&
      response.ok()
  )
  await row.getByRole("button", { name: action, exact: true }).click()
  await saved
}

test.describe.configure({ mode: "serial" })

test.describe("signed-in ritual on ritestack.app", () => {
  test("Decide and Inventory are separate views", async ({ page }) => {
    await page.goto("/")
    await waitForSignedIn(page)
    await assertOnlyOwnRows(page)

    await expect(page.locator("[data-view='decide']")).toBeVisible()
    await expect(page.getByRole("heading", { name: /You don’t miss the cancel button/ })).toBeVisible()
    await expect(page.getByText("Nothing to decide")).toBeVisible()
    await expect(page.getByText("Full list. Add and edit here.")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Add (a )?subscription/i })).toHaveCount(0)

    await page.getByRole("tab", { name: /^Inventory$/ }).click()
    await expect(page).toHaveURL(/\/inventory\/?$/)
    await expect(page.locator("[data-view='inventory']")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible()
    await expect(page.getByText("No tools on the list yet")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Why" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Keep", exact: true })).toHaveCount(0)

    await page.getByRole("tab", { name: /^Decide/ }).click()
    await expect(page).toHaveURL(/https:\/\/ritestack\.app\/?$/)
    await expect(page.locator("[data-view='decide']")).toBeVisible()
  })

  test("add a tool, keep / cut / pause, cancel URLs, monthly burn", async ({ page }) => {
    await page.goto("/inventory")
    await waitForSignedIn(page)
    await assertOnlyOwnRows(page)

    await addTool(page, { name: KEEP, cost: "11", cancelUrl: CANCEL.keep })
    await addTool(page, { name: PAUSE, cost: "22", cancelUrl: CANCEL.pause })
    await addTool(page, { name: CUT, cost: "33", cancelUrl: CANCEL.cut })

    await expect(statsStrip(page).getByText("$66", { exact: true })).toBeVisible()
    await expect(page.locator("[data-list='inventory'] table").getByRole("link", { name: "Cancel URL" })).toHaveCount(3)
    await expect(
      inventoryRow(page, KEEP).getByRole("link", { name: "Cancel URL" })
    ).toHaveAttribute("href", CANCEL.keep)
    await assertOnlyOwnRows(page)

    await page.getByRole("tab", { name: /^Decide/ }).click()
    await expect(page.locator("[data-view='decide']")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Decide" })).toBeVisible()
    await expect(decideRow(page, KEEP)).toBeVisible()
    await expect(decideRow(page, PAUSE)).toBeVisible()
    await expect(decideRow(page, CUT)).toBeVisible()

    await decideOn(page, KEEP, "Keep")
    await decideOn(page, PAUSE, "Pause")

    const popupPromise = page.waitForEvent("popup")
    await decideOn(page, CUT, "Cut")
    const popup = await popupPromise
    await expect(popup).toHaveURL(/example\.com\/cancel\/cut/)
    await popup.close()

    await page.getByRole("tab", { name: /^Inventory$/ }).click()
    await expect(page.locator("[data-view='inventory']")).toBeVisible()
    await expect(inventoryRow(page, KEEP).getByText("Keep", { exact: true })).toBeVisible()
    await expect(inventoryRow(page, PAUSE).getByText("Pause", { exact: true })).toBeVisible()
    await expect(inventoryRow(page, CUT).getByText("Cut", { exact: true })).toBeVisible()
    await expect(statsStrip(page).getByText("Monthly burn")).toBeVisible()
    await expect(statsStrip(page).locator("div").filter({ hasText: "Monthly burn" }).getByText("$33", { exact: true })).toBeVisible()
    await expect(statsStrip(page).locator("div").filter({ hasText: "Cut this pass" }).getByText("$33", { exact: true })).toBeVisible()
    await assertOnlyOwnRows(page)
  })
})

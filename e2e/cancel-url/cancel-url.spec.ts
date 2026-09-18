import { expect, test, type Locator, type Page, type Response } from "@playwright/test"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { CancelUrlAccountMeta, LookupProbe } from "./auth"

const here = dirname(fileURLToPath(import.meta.url))
const meta = JSON.parse(
  readFileSync(resolve(here, ".auth/account.json"), "utf8")
) as CancelUrlAccountMeta
const probe = JSON.parse(readFileSync(resolve(here, ".auth/probe.json"), "utf8")) as LookupProbe

const CATALOG_FALLBACK = "Cursor"
const ARBITRARY_NAMES = ["Netlify", "Fly"] as const

function blocked(detail: string): string {
  return (
    `BLOCKED: add-subscription cancel URL fill is not live on https://ritestack.app. ${detail} ` +
    "Did not re-enable Deploy RiteStack to Cloudflare."
  )
}

function isCancelLookupUrl(url: string) {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "")
    return (
      path === "/api/cancel-lookup" ||
      path === "/api/cancel-url/lookup" ||
      path === "/api/cancel-url"
    )
  } catch {
    return false
  }
}

/** Only accept a URL the API actually returned. Never invent one. */
function urlFromLookupBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const value = (body as { url?: unknown }).url
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed
  return null
}

function lookupNameFromRequest(response: Response): string {
  const raw = response.request().postData() ?? ""
  try {
    const parsed = JSON.parse(raw) as { name?: unknown }
    return typeof parsed.name === "string" ? parsed.name : ""
  } catch {
    return ""
  }
}

function waitForLookup(page: Page, name: string) {
  return page.waitForResponse(
    (response) => {
      if (response.request().method() !== "POST") return false
      if (!isCancelLookupUrl(response.url())) return false
      return lookupNameFromRequest(response) === name
    },
    { timeout: 20_000 }
  )
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

async function openAddDialog(page: Page) {
  await page.goto("/inventory")
  await waitForSignedIn(page)
  await page.getByRole("button", { name: /Add (a )?subscription/i }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  return dialog
}

async function catalogNameFromForm(dialog: Locator) {
  const options = dialog.locator("#ritestack-catalog-names option")
  const count = await options.count()
  if (count === 0) return CATALOG_FALLBACK
  const titles = await options.evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value.trim())
      .filter(Boolean)
  )
  return titles.find((title) => title === CATALOG_FALLBACK) ?? titles[0] ?? CATALOG_FALLBACK
}

function renewDatePlus(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

async function fillRequiredExceptName(dialog: Locator, cost: string) {
  await dialog.locator("#sub-cost").fill(cost)
  await dialog.locator("#sub-renew").fill(renewDatePlus(14))
}

async function capturedLookupUrl(response: Response): Promise<string | null> {
  const contentType = response.headers()["content-type"] ?? ""
  if (!response.ok() || !contentType.includes("json")) {
    throw new Error(
      blocked(
        `Lookup ${response.url()} returned ${response.status()} (${contentType || "no content-type"}).`
      )
    )
  }
  return urlFromLookupBody(await response.json())
}

test.describe("add-subscription cancel URL fill on ritestack.app", () => {
  test.describe.configure({ mode: "serial" })

  test("lookup API is live", async () => {
    expect(
      probe.live,
      blocked(`POST ${probe.path} → ${probe.status} (${probe.contentType || "no content-type"}).`)
    ).toBe(true)
  })

  test("selecting or typing a catalog name fills cancel URL from lookup", async ({ page }) => {
    expect(probe.live, blocked(`POST ${probe.path} → ${probe.status}.`)).toBe(true)

    const dialog = await openAddDialog(page)
    const name = await catalogNameFromForm(dialog)
    const lookup = waitForLookup(page, name)
    await dialog.locator("#sub-name").fill(name)

    let response: Response
    try {
      response = await lookup
    } catch {
      throw new Error(
        blocked(`Typing catalog name "${name}" did not POST a cancel-url lookup with that name.`)
      )
    }

    expect(lookupNameFromRequest(response)).toBe(name)
    const returned = await capturedLookupUrl(response)
    const cancel = dialog.locator("#sub-cancel")
    if (returned) {
      await expect(cancel).toHaveValue(returned)
    } else {
      await expect
        .poll(async () => cancel.inputValue(), { timeout: 8_000 })
        .toMatch(/^https?:\/\//)
      const filled = await cancel.inputValue()
      expect(filled.startsWith("http://") || filled.startsWith("https://")).toBe(true)
    }

    const add = dialog.getByRole("button", { name: "Add to list" })
    await expect(add).toBeEnabled()
  })

  test("typing an arbitrary name looks up that name and fills only a returned URL", async ({
    page,
  }) => {
    expect(probe.live, blocked(`POST ${probe.path} → ${probe.status}.`)).toBe(true)

    const dialog = await openAddDialog(page)
    const add = dialog.getByRole("button", { name: "Add to list" })
    await expect(add).toBeEnabled()

    for (const name of ARBITRARY_NAMES) {
      const lookup = waitForLookup(page, name)
      await dialog.locator("#sub-name").fill(name)
      await expect(add).toBeEnabled()

      let response: Response
      try {
        response = await lookup
      } catch {
        throw new Error(
          blocked(`Typing "${name}" did not POST a cancel-url lookup using that name.`)
        )
      }

      expect(lookupNameFromRequest(response)).toBe(name)
      const returned = await capturedLookupUrl(response)
      const cancel = dialog.locator("#sub-cancel")
      if (returned) {
        await expect(cancel).toHaveValue(returned)
      } else {
        await expect(cancel).toHaveValue("")
      }
      await expect(add).toBeEnabled()
    }
  })

  test("Add is not blocked when lookup misses", async ({ page }) => {
    const dialog = await openAddDialog(page)
    const name = `E2E NoCancel ${meta.stamp}`
    const add = dialog.getByRole("button", { name: "Add to list" })
    await expect(add).toBeEnabled()

    const lookup = probe.live ? waitForLookup(page, name).catch(() => null) : Promise.resolve(null)
    await dialog.locator("#sub-name").fill(name)
    await fillRequiredExceptName(dialog, "9")
    await expect(add).toBeEnabled()

    const response = await lookup
    if (response) {
      const returned = urlFromLookupBody(
        response.ok() ? await response.json().catch(() => null) : null
      )
      if (returned) {
        await expect(dialog.locator("#sub-cancel")).toHaveValue(returned)
      }
    }

    await expect(add).toBeEnabled()
    await add.click()
    await expect(dialog).toBeHidden()
    await expect(
      page.locator("[data-list='inventory'] table tr", { hasText: name })
    ).toBeVisible()
  })
})

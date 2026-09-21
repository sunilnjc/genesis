import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import { playwrightAuthCookies } from "../../src/lib/auth/session-cookie"
import { prepareIsoPair, proveApiIsolation, wipeIsoRows } from "../../scripts/isolation-test.mjs"

// Dedicated disposable accounts; never founder rows or a paid grant.
process.env.RITESTACK_ISO_A_EMAIL = "ritestack-iso-cuts-a@example.invalid"
process.env.RITESTACK_ISO_B_EMAIL = "ritestack-iso-cuts-b@example.invalid"
let pair: Awaited<ReturnType<typeof prepareIsoPair>>
const name = "RiteStack cuts QA"
async function signIn(context: BrowserContext, origin: string, session: unknown) {
  await context.addCookies(playwrightAuthCookies(origin, pair.storageKey, session).map(cookie => ({
    name: cookie.name, value: cookie.value, url: cookie.url, httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite,
  })))
}
async function billing(page: Page, state: "trial" | "paywall" | "paid") {
  await page.route("**/api/billing/status*", route => route.fulfill({ json: {
    viewList: true, ritual: state !== "paywall", state, daysLeft: state === "trial" ? 6 : 0,
    trialEndsAt: null, packPaidAt: null, checkoutEnabled: false, checkoutConfigured: false,
    checkoutProvider: "paddle", paddleEnv: "sandbox", stripeMode: null,
  }}))
}

test.beforeAll(async () => {
  pair = await prepareIsoPair({ secretName: name })
  if (pair.projectRef !== "gmbretmepjxrsmuxvpbn") throw new Error("Expected RiteStack project")
  await proveApiIsolation(pair)
  const { error } = await pair.clientA.from("subscriptions").update({ decision: "cut", cut_at: "2026-09-21" }).eq("id", pair.secretRow.id)
  if (error) throw error
})
test.afterAll(async () => {
  if (pair) await wipeIsoRows(pair.admin, [pair.userA.id, pair.userB.id])
})

for (const state of ["trial", "paywall", "paid"] as const) {
  test(`${state}: receipts and cancel link are free`, async ({ page, context, baseURL }) => {
    await signIn(context, baseURL!, pair.sessionA)
    await billing(page, state)
    await page.goto("/cuts", { waitUntil: "domcontentloaded" })
    const cuts = page.locator('[data-list="cuts"]')
    await expect(cuts.getByText(name, { exact: true })).toBeVisible()
    await expect(cuts.getByText("$200/mo", { exact: true })).toBeVisible()
    await expect(cuts.locator("time")).toHaveAttribute("datetime", "2026-09-21")
    await expect(cuts.getByRole("link", { name: `Cancel URL for ${name}` })).toHaveAttribute("href", pair.secretRow.cancel_url)
    await expect(page.getByRole("button", { name: "Cut", exact: true })).toHaveCount(0)
    await expect(page.locator('[data-list="inventory"]')).toHaveCount(0)
    if (state === "paid") {
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(page.getByRole("tab", { name: "Cuts", exact: true }).last()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
      await page.screenshot({ path: "/tmp/ritestack-cuts-mobile.png", fullPage: true })
    }
  })
}

test("other account sees an empty receipt and cannot query another user’s cuts", async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!, pair.sessionB)
  await page.goto("/cuts", { waitUntil: "domcontentloaded" })
  await expect(page.getByText("Nothing cut yet.", { exact: true })).toBeVisible()
  await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  const { data, error } = await pair.clientB.from("subscriptions").select("*").eq("decision", "cut").eq("user_id", pair.userA.id)
  expect(error).toBeNull()
  expect(data).toEqual([])
})

test("cutting on Decide persists the date and opens the receipt", async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!, pair.sessionA)
  await billing(page, "trial")
  const { error } = await pair.clientA.from("subscriptions").update({ decision: "undecided", cut_at: null, cancel_url: "" }).eq("id", pair.secretRow.id)
  if (error) throw error
  await page.goto("/", { waitUntil: "domcontentloaded" })
  const row = page.getByRole("row").filter({ hasText: name })
  await row.getByRole("button", { name: "Cut", exact: true }).click()
  await expect(row).toHaveCount(0)
  await page.getByRole("tab", { name: "Cuts", exact: true }).first().click()
  await expect(page.locator('[data-list="cuts"]').getByText(name, { exact: true })).toBeVisible()
  const { data } = await pair.clientA.from("subscriptions").select("decision,cut_at").eq("id", pair.secretRow.id).single()
  expect(data.decision).toBe("cut")
  expect(data.cut_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test("loading and read errors never show empty or destructive reset", async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!, pair.sessionA)
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route("**/rest/v1/subscriptions*", async route => {
    await pending
    await route.fulfill({ status: 400, json: { message: "Temporary receipt read failure" } })
  })
  await page.goto("/cuts", { waitUntil: "domcontentloaded" })
  await expect(page.getByText("Loading your list…")).toBeVisible()
  await expect(page.getByText("Nothing cut yet.", { exact: true })).toHaveCount(0)
  release()
  await expect(page.getByText("Couldn’t load the list")).toBeVisible()
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Start a fresh list" })).toHaveCount(0)
})

test("hosted unsigned Cuts and Inventory share the login wall", async ({ page, baseURL }) => {
  test.skip(new URL(baseURL!).hostname === "127.0.0.1", "Localhost deliberately has founder mode; run again on hosted deployment")
  for (const path of ["/cuts", "/inventory"]) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Sign in to your stack" })).toBeVisible()
    await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  }
})

import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import { addDays, todayISO } from "../../src/lib/dates"
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
  const { error } = await pair.clientA.from("subscriptions").update({ decision: "undecided", cut_at: null, cancel_url: "", renew_date: addDays(todayISO(), 3) }).eq("id", pair.secretRow.id)
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

test("14-day default, all-Decide toggle, paused reminder, and cut receipt", async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!, pair.sessionA)
  await billing(page, "trial")
  const today = todayISO()
  const incoming = [
    { name: "Wall soon", renew_date: addDays(today, 3), decision: "undecided", remind_at: null },
    { name: "Wall later", renew_date: addDays(today, 20), decision: "undecided", remind_at: null },
    { name: "Wall paused reminder", renew_date: addDays(today, 20), decision: "pause", remind_at: addDays(today, 2) },
  ].map(row => ({ ...pair.secretRow, ...row, id: crypto.randomUUID(), cancel_url: "", cut_at: null }))
  const { error } = await pair.clientA.from("subscriptions").insert(incoming)
  if (error) throw error
  await page.goto("/", { waitUntil: "domcontentloaded" })
  const chip = page.getByRole("button", { name: "Next 14 days", exact: true })
  await expect(chip).toHaveAttribute("aria-pressed", "true")
  const queue = page.getByRole("table")
  await expect(queue.getByText("Wall soon", { exact: true })).toBeVisible()
  await expect(queue.getByText("Wall paused reminder", { exact: true })).toBeVisible()
  await expect(queue.getByText("Wall later", { exact: true })).toHaveCount(0)
  await expect(queue.getByText(name, { exact: true })).toHaveCount(0)
  await chip.click()
  await expect(chip).toHaveAttribute("aria-pressed", "false")
  await expect(queue.getByText("Wall later", { exact: true })).toBeVisible()
  await chip.click()
  await queue.getByRole("row").filter({ hasText: "Wall soon" }).getByRole("button", { name: "Cut", exact: true }).click()
  await expect(queue.getByText("Wall soon", { exact: true })).toHaveCount(0)
  await page.getByRole("tab", { name: "Cuts", exact: true }).first().click()
  await expect(page.locator('[data-list="cuts"]').getByText("Wall soon", { exact: true })).toBeVisible()
  await page.getByRole("tab", { name: "Inventory", exact: true }).first().click()
  await expect(page.getByRole("table").getByText("Wall later", { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("tab", { name: /Decide/ }).last().click()
  await expect(chip).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator('[data-list="decide-by"]').getByText("Wall paused reminder", { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: "/tmp/ritestack-wall-mobile.png", fullPage: true })
})

test("empty 14-day view stays readable after trial", async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!, pair.sessionB)
  await billing(page, "paywall")
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expect(page.getByText("Nothing renews in 14 days.", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Next 14 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: "Cut", exact: true })).toHaveCount(0)
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

test("hosted sandbox checkout still opens Paddle overlay without a client-side paid grant", async ({ request, baseURL }) => {
  test.skip(new URL(baseURL!).hostname !== "ritestack.app", "Production sandbox keep-alive")
  const headers = { Authorization: `Bearer ${pair.sessionB.access_token}` }
  const before = await request.get("/api/billing/status", { headers })
  expect(before.ok()).toBeTruthy()
  const status = await before.json()
  test.skip(status.paddleEnv !== "sandbox", "Never initiate a Live test transaction automatically")
  expect(status.checkoutProvider).toBe("paddle")
  expect(status.stripeMode).toBeNull()
  const response = await request.post("/api/billing/checkout", { headers, data: { returnTo: "/unlock" } })
  expect(response.ok()).toBeTruthy()
  const checkout = await response.json()
  expect(checkout.provider).toBe("paddle")
  expect(checkout.overlay.environment).toBe("sandbox")
  expect(Boolean(checkout.overlay.transactionId?.startsWith("txn_"))).toBeTruthy()
  expect(Boolean(checkout.overlay.clientToken?.startsWith("test_"))).toBeTruthy()
  const after = await request.get("/api/billing/status?checkout=success", { headers })
  expect((await after.json()).packPaidAt).toBeNull()
})

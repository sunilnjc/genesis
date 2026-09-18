import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test"
import {
  FOUNDER_ROW_NAMES,
  LOCAL_SEED_KEY,
  founderSeedPoison,
  prepareIsoPair,
  proveApiIsolation,
  wipeIsoRows,
} from "../../scripts/isolation-test.mjs"

type IsoPair = Awaited<ReturnType<typeof prepareIsoPair>>

async function injectSession(
  context: BrowserContext,
  storageKey: string,
  session: unknown,
  poisonSeed = false
) {
  await context.addInitScript(
    ({ storageKey, session, seedKey, poison, poisonSeed }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session))
      if (poisonSeed) window.localStorage.setItem(seedKey, poison)
      else window.localStorage.removeItem(seedKey)
    },
    {
      storageKey,
      session,
      seedKey: LOCAL_SEED_KEY,
      poison: founderSeedPoison(),
      poisonSeed,
    }
  )
}

async function waitForLogin(page: Page) {
  await expect(page.getByRole("heading", { name: "Sign in to your stack" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible()
}

async function waitForApp(page: Page, userId: string) {
  await expect(page.locator("[data-ritestack-user-id]")).toHaveAttribute("data-ritestack-user-id", userId)
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
}

async function assertNoFounderRows(page: Page) {
  for (const name of FOUNDER_ROW_NAMES) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  }
}

async function localSeedValue(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), LOCAL_SEED_KEY)
}

test.describe.configure({ mode: "serial" })

test.describe("hosted two-account isolation", () => {
  const stamp = Date.now()
  const secretName = `IsoProbe ${stamp}`
  let pair: IsoPair
  let browser: Browser

  test.beforeAll(async ({ browser: workerBrowser }) => {
    browser = workerBrowser
    pair = await prepareIsoPair({ stamp, secretName })
    await proveApiIsolation(pair)
  })

  test.afterAll(async () => {
    if (pair) await wipeIsoRows(pair.admin, [pair.userA.id, pair.userB.id])
  })

  test("unsigned HTML has no founder seed and no User A row", async ({ request, baseURL }) => {
    const response = await request.get(baseURL ?? pair.hostedOrigin)
    expect(response.ok()).toBeTruthy()
    const html = await response.text()
    expect(html).not.toContain("OpenAI Pro+")
    expect(html).not.toContain("Cursor Pro")
    expect(html).not.toContain("CoinGecko")
    expect(html).not.toContain(secretName)
    expect(html).not.toMatch(/\$200\b/)
  })

  test("unsigned visitor sees the login wall, not A’s rows or a localStorage seed", async () => {
    const context = await browser.newContext()
    await context.addInitScript(
      ({ seedKey, poison }) => {
        window.localStorage.setItem(seedKey, poison)
      },
      { seedKey: LOCAL_SEED_KEY, poison: founderSeedPoison() }
    )
    const page = await context.newPage()
    await page.goto("/inventory")
    await waitForLogin(page)
    await assertNoFounderRows(page)
    await expect(page.getByText(secretName, { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
    await expect(page.getByText("No tools on the list yet")).toHaveCount(0)
    await context.close()
  })

  test("User A sees only their IsoProbe row on ritestack.app", async () => {
    const context = await browser.newContext()
    await injectSession(context, pair.storageKey, pair.sessionA, true)
    const page = await context.newPage()
    await page.goto("/inventory")
    await waitForApp(page, pair.userA.id)
    await expect(page.getByText(secretName, { exact: true })).toBeVisible()
    await expect(page.getByText("$200").first()).toBeVisible()
    await assertNoFounderRows(page)
    const seed = await localSeedValue(page)
    if (seed) {
      expect(seed).not.toContain(secretName)
    }
    await context.close()
  })

  test("User B never sees User A’s row, even with a poisoned localStorage seed", async () => {
    const context = await browser.newContext()
    await injectSession(context, pair.storageKey, pair.sessionB, true)
    const page = await context.newPage()
    await page.goto("/inventory")
    await waitForApp(page, pair.userB.id)
    await expect(page.getByText(secretName, { exact: true })).toHaveCount(0)
    await assertNoFounderRows(page)
    await expect(page.getByText("No tools on the list yet")).toBeVisible()
    await expect(page.getByText(pair.userAEmail)).toHaveCount(0)
    await context.close()
  })

  test("separate browser contexts do not share a hosted seed or session", async () => {
    const unsigned = await browser.newContext()
    const page = await unsigned.newPage()
    await page.goto("/")
    await waitForLogin(page)
    expect(await localSeedValue(page)).toBeNull()
    const authKeys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    )
    expect(authKeys).toEqual([])
    expect(new URL(page.url()).origin).toBe(pair.hostedOrigin)
    await unsigned.close()
  })
})

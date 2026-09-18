import { expect, test } from "@playwright/test"
import { FORBIDDEN_PRODUCTS } from "./helpers"

const HOSTED = "https://ritestack.app"

test.describe("hosted ritestack.app (unsigned, no inbox)", () => {
  test("sign-in wall, billing status, no Gmail/Plaid/LinkedIn, checkout needs login", async ({
    page,
    request,
  }) => {
    const statusRes = await request.get(`${HOSTED}/api/billing/status`)
    expect(statusRes.ok()).toBeTruthy()
    const status = (await statusRes.json()) as {
      viewList?: boolean
      ritual?: boolean
      state?: string
      checkoutConfigured?: boolean
      supabaseConfigured?: boolean
      userId?: string | null
    }
    expect(status.viewList).toBe(true)
    expect(status.supabaseConfigured).toBe(true)
    expect(status.checkoutConfigured).toBe(true)
    expect(status.userId).toBeNull()
    expect(status.state).toBe("local")

    const checkout = await request.post(`${HOSTED}/api/billing/checkout`)
    expect(checkout.status()).toBe(400)
    const checkoutBody = (await checkout.json()) as { error?: string }
    expect(checkoutBody.error ?? "").toMatch(/sign in/i)

    await page.goto(HOSTED, { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Checking session…")).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByRole("heading", { name: /sign in to your stack/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /email me a sign-in link/i })).toBeVisible()
    await expect(page.getByText("OpenAI")).toHaveCount(0)
    await expect(page.getByText("$200")).toHaveCount(0)

    const text = await page.locator("body").innerText()
    expect(text).not.toMatch(FORBIDDEN_PRODUCTS)
    // Do not submit the form — never send mail to the founder inbox.
  })
})

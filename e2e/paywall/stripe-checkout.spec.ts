import { expect, test } from "@playwright/test"
import {
  completeStripeTestCard,
  expectNoInventedIntegrations,
  expectRitualLocked,
  expectRitualUnlocked,
  waitForApp,
} from "./helpers"

test.describe("Stripe $14 one-time pack (test card 4242)", () => {
  test.describe.configure({ timeout: 180_000 })

  test("checkout is hosted Stripe payment, then 4242 unlocks ritual", async ({ page, request }) => {
    const started = await request.post("/api/billing/checkout")
    expect(started.ok(), await started.text()).toBeTruthy()
    const body = (await started.json()) as { url?: string; error?: string }
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    await page.goto("/?preview=paywall")
    await waitForApp(page)
    await expectRitualLocked(page)

    await page.getByRole("button", { name: /unlock ritestack pack · \$14/i }).click()
    await completeStripeTestCard(page)
    await waitForApp(page)

    await expect(page).toHaveURL(/checkout=success|session_id=cs_/)
    await expect(page.getByText("Unlock keep / cut / pause")).toHaveCount(0)
    await expectRitualUnlocked(page)
    await expectNoInventedIntegrations(page)

    await page.goto("/inventory")
    await waitForApp(page)
    await expect(page.getByText("Monthly burn").first()).toBeVisible()
    await expect(page.getByRole("link", { name: /cancel url/i }).first()).toBeVisible()
  })
})

import assert from "node:assert/strict"
import test from "node:test"
import {
  SITE_FOOTER_COPYRIGHT,
  SITE_FOOTER_LINKS,
  siteFooterText,
} from "../src/lib/site-footer.ts"

test("site footer is copyright plus quiet product and legal links", () => {
  assert.equal(SITE_FOOTER_COPYRIGHT, "© 2026 RiteStack")
  assert.deepEqual(
    SITE_FOOTER_LINKS.map((link) => [link.href, link.label]),
    [
      ["/about", "About"],
      ["/feedback", "Feedback"],
      ["/brief", "Brief"],
      ["/terms", "Terms"],
      ["/privacy", "Privacy"],
      ["/refund", "Refund"],
    ]
  )
})

test("site footer copy stays short and does not say subscription", () => {
  const blob = siteFooterText()
  assert.doesNotMatch(blob, /subscription/i)
  assert.doesNotMatch(blob, /graveyard/i)
  assert.doesNotMatch(blob, /Plaid/)
  assert.ok(blob.split("\n").length <= 8)
  assert.ok(blob.length < 120)
})

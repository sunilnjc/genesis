import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  CONTACT_EMAIL,
  LEGAL_NAME,
  OPERATING_NAME,
  OPERATOR_LINE,
  PADDLE_MOR_NOTICE,
  PRODUCT_NAME,
  REFUND_WINDOW_DAYS,
} from "../src/lib/legal.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function pageSource(path: string) {
  return readFileSync(join(root, path), "utf8")
}

test("operator facts Paddle checks are explicit", () => {
  assert.equal(LEGAL_NAME, "Sunilkumar Kalabandi")
  assert.equal(OPERATING_NAME, "RiteStack")
  assert.equal(PRODUCT_NAME, "RiteStack")
  assert.equal(CONTACT_EMAIL, "hello@ritestack.app")
  assert.equal(REFUND_WINDOW_DAYS, 14)
  assert.match(OPERATOR_LINE, /United Arab Emirates/)
  assert.match(PADDLE_MOR_NOTICE, /Paddle\.com is the Merchant of Record/)
  assert.doesNotMatch(PADDLE_MOR_NOTICE, /graveyard/i)
})

test("terms, privacy, and refund name the founder and hello@", () => {
  const files = [
    "src/app/terms/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/refund/page.tsx",
  ]
  for (const file of files) {
    const src = pageSource(file)
    assert.match(src, /LEGAL_NAME/)
    assert.match(src, /OPERATING_NAME/)
    assert.match(src, /CONTACT_EMAIL/)
    assert.doesNotMatch(src, /subscriptiongraveyard/i)
    assert.doesNotMatch(src, /TheJobPursuit/)
    assert.doesNotMatch(src, /Gmail scanner/)
  }
})

test("terms include the Paddle merchant-of-record sentence", () => {
  const src = pageSource("src/app/terms/page.tsx")
  assert.match(src, /PADDLE_MOR_NOTICE/)
  assert.match(src, /\$14 once/)
  assert.match(src, /seven days/)
  assert.match(src, /We do not scan Gmail/)
  assert.match(src, /We do not use Plaid/)
})

test("refund is a short window through hello@", () => {
  const src = pageSource("src/app/refund/page.tsx")
  assert.match(src, /REFUND_WINDOW_DAYS/)
  assert.match(src, /PADDLE_MOR_NOTICE/)
  assert.match(src, /paddle\.net/)
})

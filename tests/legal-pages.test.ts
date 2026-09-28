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
    "src/components/terms-content.tsx",
    "src/components/privacy-content.tsx",
    "src/components/refund-content.tsx",
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
  const src = pageSource("src/components/terms-content.tsx")
  assert.match(src, /PADDLE_MOR_NOTICE/)
  assert.match(src, /\$14 once/)
  assert.match(src, /seven days/)
  assert.match(src, /We do not scan Gmail/)
  assert.match(src, /We do not use Plaid/)
})

test("refund is a short window through hello@", () => {
  const src = pageSource("src/components/refund-content.tsx")
  assert.match(src, /REFUND_WINDOW_DAYS/)
  assert.match(src, /PADDLE_MOR_NOTICE/)
  assert.match(src, /paddle\.net/)
})


test("web and mobile legal routes use the same policy content", () => {
  for (const name of ["terms", "privacy", "refund", "support"]) {
    const component = `${name[0].toUpperCase()}${name.slice(1)}Content`
    const web = pageSource(`src/app/${name}/page.tsx`)
    const mobile = pageSource(`src/app/mobile/${name}/page.tsx`)
    assert.ok(web.includes(`@/components/${name}-content`))
    assert.ok(mobile.includes(`@/components/${name}-content`))
    assert.ok(web.includes(`<${component} />`))
    assert.ok(mobile.includes(`<${component} mobile />`))
  }
})

test("mobile legal navigation stays within administrative resources", () => {
  const legal = pageSource("src/components/legal-page.tsx")
  assert.ok(legal.includes('mobile ? `/mobile${link.href}` : link.href'))
  assert.ok(legal.includes('{!mobile && <Link href="/about"'))
  assert.ok(legal.includes('href="/delete-account"'))
  for (const name of ["privacy", "refund"]) {
    const content = pageSource(`src/components/${name}-content.tsx`)
    assert.ok(content.includes('{mobile ? <span>paddle.net</span> : <a'))
  }
  const terms = pageSource("src/components/terms-content.tsx")
  assert.ok(terms.includes('mobile ? "/mobile/refund" : "/refund"'))
  assert.ok(terms.includes('mobile ? "/mobile/privacy" : "/privacy"'))
  const footer = pageSource("src/components/site-footer.tsx")
  assert.ok(footer.includes('if (pathname.startsWith("/mobile/") || pathname === "/delete-account") return null'))
})

test("public deletion explains an app-independent request and data scope", () => {
  const source = pageSource("src/app/delete-account/page.tsx")
  assert.match(source, /without installing or signing in/)
  assert.match(source, /mailto:/)
  assert.match(source, /CONTACT_EMAIL/)
  assert.match(source, /verify ownership/)
  assert.match(source, /sign-in account, access profile and tool inventory/)
  assert.match(source, /Backups/)
  assert.match(source, /Payment processors/)
  assert.match(source, /does not cancel subscriptions/)
})

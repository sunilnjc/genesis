import assert from "node:assert/strict"
import test from "node:test"
import { cancelUrlFromLookup } from "../src/lib/cancel-lookup-client.ts"

test("fills only a URL the lookup actually returned", () => {
  const filled = cancelUrlFromLookup({
    current: "",
    filledBy: "",
    userOwns: false,
    resultUrl: "https://app.netlify.com/teams/settings/billing",
  })
  assert.equal(filled.cancelUrl, "https://app.netlify.com/teams/settings/billing")
})

test("leaves the field empty when lookup returns nothing — does not invent a URL", () => {
  const miss = cancelUrlFromLookup({
    current: "",
    filledBy: "",
    userOwns: false,
    resultUrl: null,
  })
  assert.equal(miss.cancelUrl, "")

  const junk = cancelUrlFromLookup({
    current: "",
    filledBy: "",
    userOwns: false,
    resultUrl: "not-a-url",
  })
  assert.equal(junk.cancelUrl, "")
})

test("does not overwrite a cancel URL the customer pasted", () => {
  const kept = cancelUrlFromLookup({
    current: "https://example.com/my-billing",
    filledBy: "",
    userOwns: true,
    resultUrl: "https://claude.ai/settings/billing",
  })
  assert.equal(kept.cancelUrl, "https://example.com/my-billing")
})

test("clears a previous autofill when the next lookup misses", () => {
  const cleared = cancelUrlFromLookup({
    current: "https://cursor.com/dashboard/billing",
    filledBy: "https://cursor.com/dashboard/billing",
    userOwns: false,
    resultUrl: null,
  })
  assert.equal(cleared.cancelUrl, "")
})

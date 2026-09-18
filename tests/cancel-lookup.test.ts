import assert from "node:assert/strict"
import test from "node:test"
import { catalogCancelUrl, lookupCancelUrl } from "../src/lib/cancel-lookup.ts"
import {
  parseDuckDuckGoLite,
  pickConfidentCancelUrl,
  scoreCancelHit,
  type SearchHit,
} from "../src/lib/cancel-lookup-search.ts"

const LITE_HTML = `
<a rel="nofollow" href="https://docs.netlify.com/manage/accounts-and-billing/billing/overview/" class='result-link'>Billing overview | Netlify Docs</a>
<a rel="nofollow" href="https://nobill.app/cancel/netlify" class='result-link'>How to Cancel Netlify (2026)</a>
<a rel="nofollow" href="https://www.youtube.com/watch?v=abc" class='result-link'>How To Cancel Netlify Subscription</a>
<a rel="nofollow" href="https://answers.netlify.com/t/cancelling-netlify-subscription/163287" class='result-link'>Cancelling netlify subscription - Support</a>
`

test("catalog returns founder Claude billing URL", async () => {
  const result = await lookupCancelUrl("Claude")
  assert.deepEqual(result, {
    url: "https://claude.ai/settings/billing",
    source: "catalog",
  })
})

test("catalog matches typed names from brand-catalog, including Netlify and Fly", () => {
  assert.equal(catalogCancelUrl("Vercel"), "https://vercel.com/account/billing")
  assert.equal(catalogCancelUrl("Vercel Pro"), "https://vercel.com/account/billing")
  assert.equal(catalogCancelUrl("ChatGPT"), "https://chatgpt.com/account/manage")
  assert.equal(catalogCancelUrl("Cursor Pro"), "https://cursor.com/dashboard/billing")
  assert.equal(catalogCancelUrl("Netlify"), "https://app.netlify.com/user/billing")
  assert.equal(catalogCancelUrl("Fly"), "https://fly.io/dashboard/personal/billing")
  assert.equal(catalogCancelUrl("Fly.io"), "https://fly.io/dashboard/personal/billing")
})

test("unknown names miss the catalog", () => {
  assert.equal(catalogCancelUrl("Porkbun"), null)
  assert.equal(catalogCancelUrl("Render"), null)
  assert.equal(catalogCancelUrl("SomeUnknownSaaS"), null)
})

test("catalog hits never call search", async () => {
  for (const name of ["Claude", "Vercel", "Netlify", "Fly"]) {
    const result = await lookupCancelUrl(name, {
      search: async () => {
        throw new Error(`search should not run for catalog hit ${name}`)
      },
    })
    assert.equal(result.source, "catalog")
    assert.equal(typeof result.url, "string")
  }
})

test("parseDuckDuckGoLite keeps first-party results and drops youtube", () => {
  const hits = parseDuckDuckGoLite(LITE_HTML)
  assert.equal(
    hits.some((hit) => hit.url.startsWith("https://docs.netlify.com/")),
    true
  )
  assert.equal(
    hits.some((hit) => hit.url.includes("youtube.com")),
    false
  )
})

test("lookup accepts a first-party billing page for a catalog miss", async () => {
  const hits: SearchHit[] = [
    {
      url: "https://porkbun.com/account/billing",
      title: "Billing | Porkbun",
      snippet: "",
    },
    {
      url: "https://nobill.app/cancel/porkbun",
      title: "How to Cancel Porkbun",
      snippet: "",
    },
  ]
  const result = await lookupCancelUrl("Porkbun", {
    search: async () => hits,
    hasLlmKey: () => false,
  })
  assert.deepEqual(result, {
    url: "https://porkbun.com/account/billing",
    source: "lookup",
  })
})

test("low-confidence third-party cancel guides return no URL", async () => {
  const result = await lookupCancelUrl("Render", {
    search: async () => [
      {
        url: "https://nobill.app/cancel/render",
        title: "How to Cancel Render",
        snippet: "",
      },
      {
        url: "https://www.youtube.com/watch?v=abc",
        title: "How To Cancel Render Subscription",
        snippet: "",
      },
    ],
    hasLlmKey: () => false,
  })
  assert.deepEqual(result, { url: null, source: null })
})

test("empty search results return no URL", async () => {
  const result = await lookupCancelUrl("SomeUnknownSaaS", {
    search: async () => [],
    hasLlmKey: () => false,
  })
  assert.deepEqual(result, { url: null, source: null })
})

test("search failures return no URL instead of inventing one", async () => {
  const result = await lookupCancelUrl("Porkbun", {
    search: async () => {
      throw new Error("network down")
    },
  })
  assert.deepEqual(result, { url: null, source: null })
})

test("LLM may only return a URL that appeared in search hits", async () => {
  const hits: SearchHit[] = [
    {
      url: "https://dashboard.render.com/billing",
      title: "Billing · Render",
      snippet: "",
    },
  ]
  const invented = await lookupCancelUrl("Render", {
    search: async () => hits,
    hasLlmKey: () => true,
    llmExtract: async () => "https://render.com/billing/i-made-this-up",
  })
  assert.equal(invented.url, "https://dashboard.render.com/billing")
  assert.equal(invented.source, "lookup")

  const extracted = await lookupCancelUrl("Render", {
    search: async () => hits,
    hasLlmKey: () => true,
    llmExtract: async () => "https://dashboard.render.com/billing",
  })
  assert.deepEqual(extracted, {
    url: "https://dashboard.render.com/billing",
    source: "lookup",
  })
})

test("Gmail, Plaid, and LinkedIn hosts never score", () => {
  for (const url of [
    "https://mail.google.com/mail/u/0/#settings",
    "https://plaid.com/docs/",
    "https://www.linkedin.com/help/linkedin/answer/cancel",
  ]) {
    assert.equal(
      scoreCancelHit({ url, title: "Cancel billing", snippet: "" }, "Gmail", null),
      0
    )
  }
})

test("pickConfidentCancelUrl returns null when nothing clears the bar", () => {
  assert.equal(
    pickConfidentCancelUrl("Render", [
      { url: "https://render.com/", title: "Render", snippet: "" },
    ]),
    null
  )
})

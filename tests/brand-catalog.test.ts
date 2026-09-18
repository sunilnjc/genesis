import assert from "node:assert/strict"
import test from "node:test"
import {
  BRAND_CATALOG,
  catalogCancelUrl,
  matchBrand,
} from "../src/lib/brand-catalog.ts"

test("every catalog cancel URL is an official https page", () => {
  for (const brand of BRAND_CATALOG) {
    assert.ok(brand.cancelUrl, `${brand.title} is missing a cancel URL`)
    assert.match(brand.cancelUrl, /^https:\/\//)
  }
})

test("catalogCancelUrl matches founder tools and nearby AI/dev apps", () => {
  const expected: Record<string, string> = {
    Claude: "https://claude.ai/settings/billing",
    "Claude Pro": "https://claude.ai/settings/billing",
    Vercel: "https://vercel.com/account/billing",
    "Vercel Pro": "https://vercel.com/account/billing",
    Netlify: "https://app.netlify.com/user/billing",
    Fly: "https://fly.io/dashboard/personal/billing",
    "Fly.io": "https://fly.io/dashboard/personal/billing",
    ChatGPT: "https://chatgpt.com/account/manage",
    "OpenAI Pro+": "https://chatgpt.com/account/manage",
    "Cursor Pro": "https://cursor.com/dashboard/billing",
    "Cloudflare workers": "https://dash.cloudflare.com/?to=/:account/billing",
    "Twitter (X)": "https://x.com/settings/subscription",
    CoinGecko: "https://www.coingecko.com/en/developers/dashboard",
    Anthropic: "https://console.anthropic.com/settings/billing",
    Copilot: "https://github.com/settings/billing",
    Notion: "https://www.notion.so/my-account",
    Figma: "https://www.figma.com/settings",
    Linear: "https://linear.app/settings/billing",
    Railway: "https://railway.com/workspace/billing",
    Grammarly: "https://account.grammarly.com/subscription",
    Supabase: "https://supabase.com/dashboard/org/_/billing",
    Resend: "https://resend.com/settings/billing",
    Perplexity: "https://www.perplexity.ai/account/details",
    Gemini: "https://one.google.com/settings",
  }

  for (const [name, url] of Object.entries(expected)) {
    assert.equal(catalogCancelUrl(name), url, name)
  }
})

test("unknown names do not invent a cancel URL", () => {
  assert.equal(catalogCancelUrl(""), null)
  assert.equal(catalogCancelUrl("SomeUnknownSaaS"), null)
  assert.equal(matchBrand("SomeUnknownSaaS"), null)
})

test("Netlify and Fly.io join the catalog with local marks", () => {
  const netlify = matchBrand("Netlify")
  const fly = matchBrand("Fly.io")
  assert.equal(netlify?.slug, "netlify")
  assert.equal(netlify?.src, "/brands/netlify.svg")
  assert.equal(fly?.slug, "flydotio")
  assert.equal(fly?.src, "/brands/flydotio.svg")
})

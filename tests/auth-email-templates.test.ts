import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import {
  assertRiteStackRef,
  confirmationUrl,
  fillTemplate,
  pickTemplateName,
  RITESTACK_SUPABASE_REF,
} from "../workers/auth-mail/src/render.js"
import { verifyStandardWebhook } from "../workers/auth-mail/src/webhook.js"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const TEMPLATE_DIR = join(ROOT, "supabase", "templates")
const TEMPLATES = ["sign-in.html", "confirm-sign-up.html"]

function startTags(source) {
  const tags = []
  const re = /<([a-zA-Z0-9]+)([^>]*)>/g
  let match
  while ((match = re.exec(source))) {
    const tag = match[1].toLowerCase()
    const attrs = {}
    const attrRe = /([a-zA-Z-:]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g
    let attr
    while ((attr = attrRe.exec(match[2]))) {
      attrs[attr[1]] = attr[2] ?? attr[3] ?? ""
    }
    tags.push([tag, attrs])
  }
  return tags
}

test("both auth flows have code and confirmation link", () => {
  for (const filename of TEMPLATES) {
    const source = readFileSync(join(TEMPLATE_DIR, filename), "utf8")
    assert.equal(source.split("{{ .Token }}").length - 1, 1)
    assert.equal(source.split("{{ .ConfirmationURL }}").length - 1, 1)
    const vars = [...source.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1])
    assert.deepEqual(new Set(vars), new Set([".Token", ".ConfirmationURL"]))
  }
})

test("link uses supabase confirmation url not a fixed redirect", () => {
  for (const filename of TEMPLATES) {
    const source = readFileSync(join(TEMPLATE_DIR, filename), "utf8")
    const links = startTags(source)
      .filter(([tag]) => tag === "a")
      .map(([, attrs]) => attrs.href)
    assert.deepEqual(links, ["{{ .ConfirmationURL }}"])
  }
})

test("no trackers scripts remote assets or form submission", () => {
  for (const filename of TEMPLATES) {
    const source = readFileSync(join(TEMPLATE_DIR, filename), "utf8")
    const tags = startTags(source)
    for (const [tag, attrs] of tags) {
      assert.equal(["script", "iframe", "form", "img", "link", "object"].includes(tag), false)
      assert.equal(Object.keys(attrs).some((key) => key.startsWith("on")), false)
      assert.equal("src" in attrs, false)
    }
    assert.equal(/\burl\s*\(/i.test(source), false)
  }
})

test("accessible responsive structure", () => {
  for (const filename of TEMPLATES) {
    const tags = startTags(readFileSync(join(TEMPLATE_DIR, filename), "utf8"))
    assert.ok(tags.some(([tag, attrs]) => tag === "html" && attrs.lang === "en"))
    assert.ok(tags.some(([tag, attrs]) => tag === "meta" && attrs.name === "viewport"))
    assert.equal(tags.filter(([tag]) => tag === "h1").length, 1)
    assert.ok(tags.filter(([tag]) => tag === "table").every(([, attrs]) => attrs.role === "presentation"))
  }
})

test("confirmation URL stays on the RiteStack project", () => {
  const url = confirmationUrl(
    {
      token_hash: "abc123",
      email_action_type: "magiclink",
      redirect_to: "https://ritestack.app/auth/callback",
    },
    `https://${RITESTACK_SUPABASE_REF}.supabase.co`
  )
  assert.equal(
    url,
    `https://${RITESTACK_SUPABASE_REF}.supabase.co/auth/v1/verify?token=abc123&type=magiclink&redirect_to=https%3A%2F%2Fritestack.app%2Fauth%2Fcallback`
  )
  assert.equal(pickTemplateName("magiclink"), "sign-in.html")
  assert.equal(pickTemplateName("signup"), "confirm-sign-up.html")
  assert.throws(() => assertRiteStackRef("https://vhjwzxcgkmxvrmfstzpy.supabase.co"))
})

test("renderer fills gotrue placeholders only", () => {
  const source = readFileSync(join(TEMPLATE_DIR, "sign-in.html"), "utf8")
  const html = fillTemplate(
    source,
    {
      token: "305805",
      token_hash: "deadbeef",
      email_action_type: "magiclink",
      redirect_to: "https://ritestack.app/auth/callback",
    },
    `https://${RITESTACK_SUPABASE_REF}.supabase.co`
  )
  assert.equal(html.includes("305805"), true)
  assert.equal(html.includes("{{ .Token }}"), false)
  assert.equal(html.includes("{{ .ConfirmationURL }}"), false)
  assert.equal(html.includes(`${RITESTACK_SUPABASE_REF}.supabase.co/auth/v1/verify`), true)
  assert.equal(html.includes("thejobpursuit"), false)
})

test("standard webhooks signature verifies", async () => {
  const raw = crypto.getRandomValues(new Uint8Array(24))
  const secret = `v1,whsec_${Buffer.from(raw).toString("base64")}`
  const payload = JSON.stringify({ user: { email: "qa@ritestack.app" }, email_data: { token: "1" } })
  const id = "msg_test"
  const timestamp = "1710000000"
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`))
  const signature = Buffer.from(new Uint8Array(sig)).toString("base64")
  const event = await verifyStandardWebhook(payload, new Headers({
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}`,
  }), secret)
  assert.equal(event.user.email, "qa@ritestack.app")
  await assert.rejects(() => verifyStandardWebhook(payload, new Headers({
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": "v1,aaaa",
  }), secret))
})

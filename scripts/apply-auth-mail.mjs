#!/usr/bin/env node
/**
 * Apply RiteStack branded Auth templates (and optionally the Send Email hook).
 * Never points at Job Pursuit. Does not print secrets.
 *
 *   node scripts/apply-auth-mail.mjs --templates
 *   node scripts/apply-auth-mail.mjs --enable-hook https://ritestack-auth-mail.bullsof2028.workers.dev
 *
 * Hook secret: SEND_EMAIL_HOOK_SECRET in the environment (v1,whsec_…).
 */
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const REF = "gmbretmepjxrsmuxvpbn"
const JOB_PURSUIT = "vhjwzxcgkmxvrmfstzpy"
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`

function token() {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN
  if (fromEnv) return fromEnv.trim()
  return readFileSync(join(homedir(), ".supabase", "access-token"), "utf8").trim()
}

function template(name) {
  return readFileSync(join(ROOT, "supabase", "templates", name), "utf8")
}

async function patch(body) {
  const res = await fetch(API, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Auth config PATCH ${res.status}: ${text.slice(0, 500)}`)
  }
  return JSON.parse(text)
}

function summarize(config) {
  return {
    site_url: config.site_url,
    smtp_host: config.smtp_host,
    smtp_admin_email: config.smtp_admin_email,
    smtp_sender_name: config.smtp_sender_name,
    hook_send_email_enabled: config.hook_send_email_enabled,
    hook_send_email_uri: config.hook_send_email_uri,
    mailer_subjects_magic_link: config.mailer_subjects_magic_link,
    magic_link_custom: config.mailer_templates_custom_contents?.MAILER_TEMPLATES_MAGIC_LINK_CONTENT,
    confirmation_custom: config.mailer_templates_custom_contents?.MAILER_TEMPLATES_CONFIRMATION_CONTENT,
    magic_link_has_token: String(config.mailer_templates_magic_link_content || "").includes("{{ .Token }}"),
    magic_link_has_confirmation: String(config.mailer_templates_magic_link_content || "").includes("{{ .ConfirmationURL }}"),
    mentions_job_pursuit: JSON.stringify(config).includes(JOB_PURSUIT) || JSON.stringify(config).toLowerCase().includes("thejobpursuit"),
  }
}

const args = process.argv.slice(2)
const doTemplates = args.includes("--templates") || args.length === 0
const hookFlag = args.indexOf("--enable-hook")
const hookUri = hookFlag >= 0 ? args[hookFlag + 1] : null
const disableHook = args.includes("--disable-hook")

if (hookUri && !hookUri.startsWith("https://")) {
  throw new Error("Hook URI must be https.")
}

const body = {}
if (doTemplates) {
  body.mailer_subjects_magic_link = "Your RiteStack sign-in code"
  body.mailer_subjects_confirmation = "Confirm your email for RiteStack"
  body.mailer_templates_magic_link_content = template("sign-in.html")
  body.mailer_templates_confirmation_content = template("confirm-sign-up.html")
}
if (disableHook) {
  body.hook_send_email_enabled = false
}
if (hookUri) {
  const secret = (process.env.SEND_EMAIL_HOOK_SECRET || "").trim()
  if (!secret) throw new Error("SEND_EMAIL_HOOK_SECRET is required to enable the hook.")
  body.hook_send_email_enabled = true
  body.hook_send_email_uri = hookUri
  body.hook_send_email_secrets = secret
}

const smtpPass = (process.env.RITESTACK_SMTP_PASS || "").trim()
if (smtpPass) {
  body.smtp_host = process.env.RITESTACK_SMTP_HOST || "smtp.mx.cloudflare.net"
  body.smtp_port = Number(process.env.RITESTACK_SMTP_PORT || "465")
  body.smtp_user = process.env.RITESTACK_SMTP_USER || "api_token"
  body.smtp_pass = smtpPass
  body.smtp_admin_email = process.env.RITESTACK_SMTP_FROM || "hello@ritestack.app"
  body.smtp_sender_name = process.env.RITESTACK_SMTP_FROM_NAME || "RiteStack"
}

const config = await patch(body)
console.log(JSON.stringify(summarize(config), null, 2))

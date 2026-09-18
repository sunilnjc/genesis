import { assertRiteStackRef, fillTemplate, FROM_EMAIL, FROM_NAME, pickTemplateName, RITESTACK_SUPABASE_REF, subjectFor } from "./render.js"
import { verifyStandardWebhook } from "./webhook.js"
import confirmSignUpHtml from "../../../supabase/templates/confirm-sign-up.html"
import signInHtml from "../../../supabase/templates/sign-in.html"

const TEMPLATES = {
  "sign-in.html": signInHtml,
  "confirm-sign-up.html": confirmSignUpHtml,
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("not allowed", { status: 400 })
    }

    const supabaseUrl = env.AUTH_SUPABASE_URL || `https://${RITESTACK_SUPABASE_REF}.supabase.co`
    try {
      assertRiteStackRef(supabaseUrl)
    } catch (error) {
      return json({ error: { message: error.message } }, 500)
    }

    const payload = await request.text()
    let event
    try {
      event = await verifyStandardWebhook(payload, request.headers, env.SEND_EMAIL_HOOK_SECRET)
    } catch (error) {
      return json({ error: { http_code: 401, message: error.message } }, 401)
    }

    const user = event.user || {}
    const emailData = event.email_data || {}
    const to = user.email
    if (!to || !emailData.token_hash || !emailData.email_action_type) {
      return json({ error: { message: "Incomplete auth email payload." } }, 400)
    }

    const html = fillTemplate(TEMPLATES[pickTemplateName(emailData.email_action_type)], emailData, supabaseUrl)

    try {
      await env.EMAIL.send({
        to,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: subjectFor(emailData.email_action_type, emailData.token),
        html,
        text: `Your RiteStack code is ${emailData.token || ""}. Open the sign-in link from the HTML email, or request a new one in the app.`,
      })
    } catch (error) {
      return json({ error: { message: error.message || "Email send failed." } }, 500)
    }

    return json({})
  },
}

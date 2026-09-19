import {
  FEEDBACK_TO,
  formatFeedbackText,
  trimFeedback,
  validateFeedback,
} from "@/app/feedback/feedback"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

type EmailSender = {
  send: (message: {
    to: string
    from: { email: string; name: string }
    subject: string
    text: string
  }) => Promise<void>
}

async function trySend(text: string): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    const sender = (env as { EMAIL?: EmailSender }).EMAIL
    if (!sender?.send) return false
    await sender.send({
      to: FEEDBACK_TO,
      from: { email: FEEDBACK_TO, name: "RiteStack" },
      subject: "RiteStack feedback",
      text,
    })
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: "Expected JSON { name?, email, message }." }, 400)
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json({ error: "Expected JSON { name?, email, message }." }, 400)
  }

  const payload = trimFeedback(raw as Record<string, unknown>)
  const invalid = validateFeedback(payload)
  if (invalid) return json({ error: invalid }, 400)

  const sent = await trySend(formatFeedbackText(payload))
  if (sent) return json({ ok: true })
  return json({ ok: false, fallback: "mailto" })
}

export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } })
}

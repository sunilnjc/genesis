import {
  FEEDBACK_TO,
  formatFeedbackText,
  trimFeedback,
  validateFeedback,
} from "@/app/feedback/feedback"
import { sendRiteStackMail } from "@/lib/ritestack-mail"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

async function trySend(text: string): Promise<boolean> {
  return sendRiteStackMail({
    to: FEEDBACK_TO,
    subject: "RiteStack feedback",
    text,
  })
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

export const FEEDBACK_TO = "hello@ritestack.app"

export type FeedbackPayload = {
  name: string
  email: string
  message: string
}

export function trimFeedback(input: {
  name?: unknown
  email?: unknown
  message?: unknown
}): FeedbackPayload {
  return {
    name: typeof input.name === "string" ? input.name.trim() : "",
    email: typeof input.email === "string" ? input.email.trim() : "",
    message: typeof input.message === "string" ? input.message.trim() : "",
  }
}

export function validateFeedback(input: FeedbackPayload): string | null {
  if (!input.email) return "Email is required."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "That email doesn’t look right."
  if (input.email.length > 200) return "Email is too long."
  if (input.name.length > 80) return "Name is too long."
  if (!input.message) return "Write a message."
  if (input.message.length > 4000) return "Message is too long."
  return null
}

export function formatFeedbackText(input: FeedbackPayload): string {
  const who = input.name ? `${input.name} (${input.email})` : input.email
  return `From: ${who}\n\n${input.message}`
}

export function buildMailtoHref(input: FeedbackPayload): string {
  const subject = encodeURIComponent("RiteStack feedback")
  const body = encodeURIComponent(formatFeedbackText(input))
  return `mailto:${FEEDBACK_TO}?subject=${subject}&body=${body}`
}

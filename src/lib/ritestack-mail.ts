/** Cloudflare Email Sending on the ritestack worker. From-address is already verified. */

export const RITESTACK_FROM_EMAIL = "hello@ritestack.app"
export const RITESTACK_FROM_NAME = "RiteStack"

export type RiteStackMail = {
  to: string
  subject: string
  text: string
}

type EmailSender = {
  send: (message: {
    to: string
    from: { email: string; name: string }
    subject: string
    text: string
  }) => Promise<void>
}

export async function sendRiteStackMail(message: RiteStackMail): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare")
    const { env } = await getCloudflareContext({ async: true })
    const sender = (env as { EMAIL?: EmailSender }).EMAIL
    if (!sender?.send) return false
    await sender.send({
      to: message.to,
      from: { email: RITESTACK_FROM_EMAIL, name: RITESTACK_FROM_NAME },
      subject: message.subject,
      text: message.text,
    })
    return true
  } catch {
    return false
  }
}

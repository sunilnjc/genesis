import type { Metadata } from "next"
import { CONTACT_EMAIL, PRODUCT_NAME } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Delete your account · RiteStack",
  description: "Request deletion of your RiteStack account and associated inventory without installing the app.",
}

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10 text-sm leading-relaxed">
      <h1 className="font-heading text-2xl font-medium">Delete your {PRODUCT_NAME} account</h1>
      <p>You can request account deletion here without installing or signing in to the app.</p>
      <section className="space-y-3">
        <h2 className="font-heading font-medium">Request deletion by email</h2>
        <p>Email <a href={`mailto:${CONTACT_EMAIL}?subject=RiteStack%20account%20deletion%20request`} className="underline">{CONTACT_EMAIL}</a> from the email address associated with your RiteStack account. Use the subject “RiteStack account deletion request” and say that you want your account and associated data deleted.</p>
        <p>We may ask you to verify ownership before proceeding. Never send a password, sign-in code, identity document or payment details. If you no longer have access to your account email, contact the same address for help.</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading font-medium">What deletion removes</h2>
        <p>Deletion permanently removes your sign-in account, access profile and tool inventory, including renewal dates, amounts, billing links and Keep, Cut or Pause decisions. This affects your RiteStack account across devices.</p>
        <p>Backups may take a short time to expire. Payment processors may retain transaction records where required by law. We will explain any information that must be retained when responding to your request.</p>
        <p>Deleting RiteStack does not cancel subscriptions with other providers or automatically refund a payment. Manage those subscriptions directly with the relevant provider.</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading font-medium">Delete from the mobile app</h2>
        <p>If you are signed in, open Account, choose Delete account, type DELETE and confirm permanent deletion.</p>
      </section>
    </main>
  )
}

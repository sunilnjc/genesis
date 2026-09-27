import type { Metadata } from "next"
import { LegalPage, LegalSection } from "@/components/legal-page"
import { CONTACT_EMAIL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Support · RiteStack",
  description: "Help with RiteStack sign-in, inventory, reminders and account deletion.",
}

export default function SupportPage() {
  return (
    <LegalPage screen="support" title="RiteStack support" lede="Help with your stack, on the web and on iOS.">
      <LegalSection heading="Contact us">
        <p>Email <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> with your question, app version and device type. Never send passwords, sign-in codes, card details or bank details.</p>
      </LegalSection>
      <LegalSection heading="Signing in">
        <p>Use the same email address on every device. On iOS, enter the latest one-time code from your sign-in email. Check spam if the email is missing, and wait a minute before requesting another code.</p>
      </LegalSection>
      <LegalSection heading="Your tools and decisions">
        <p>Add the tools you pay for and their monthly USD amounts. Pull down to refresh your stack. Keep, Cut and Pause record your decisions; they do not cancel or pause the actual provider subscription. Complete changes with the provider using its billing page.</p>
        <p>Inventory and cut receipts remain available when ritual access expires. Sample preview is separate from your account and never saves changes remotely.</p>
      </LegalSection>
      <LegalSection heading="iOS reminders">
        <p>Enable Local reminders in Account and allow notifications in iOS Settings. Reminders appear at 9 AM for upcoming renewal and pause-review dates. Open the app regularly to refresh the next 60 reminders. Signing out clears reminders on that device.</p>
      </LegalSection>
      <LegalSection heading="Delete your account">
        <p>In iOS, open Account, choose Delete account, type DELETE and confirm. This permanently removes your account, inventory and access profile across devices. It does not cancel subscriptions with other providers or automatically refund a payment.</p>
        <p>You can also request access, correction or deletion by emailing {CONTACT_EMAIL} from your account email address.</p>
      </LegalSection>
    </LegalPage>
  )
}

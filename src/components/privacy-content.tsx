import {
  CONTACT_EMAIL,
  LEGAL_NAME,
  OPERATING_NAME,
  OPERATOR_LINE,
  PADDLE_BUYER_SUPPORT,
  PRODUCT_NAME,
} from "@/lib/legal"
import { LegalPage, LegalSection } from "@/components/legal-page"


export function PrivacyContent({ mobile = false }: { mobile?: boolean }) {
  return (
    <LegalPage mobile={mobile}
      screen="privacy"
      title="Privacy"
      lede={`${OPERATOR_LINE} This page is what ${PRODUCT_NAME} actually stores.`}
    >
      <LegalSection heading="Who holds this">
        <p>
          {LEGAL_NAME}, an individual in the United Arab Emirates, operates {OPERATING_NAME}. Write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          for access, correction, or deletion.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>Only what the ritual needs:</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Email, so we can send a one-time sign-in code.</li>
          <li>
            The rows you type: tool name, monthly cost, renew date, last-used, cancel URL, and
            keep / cut / pause.
          </li>
          <li>Whether the seven-day ritual is open, and whether the $14 pack is paid.</li>
          <li>Optional feedback: name if you give one, email, and the note.</li>
        </ul>
        <p className="text-muted-foreground">
          Hosting logs (IP, user agent, time) may sit with Cloudflare for a short window so the
          site can stay up.
        </p>
      </LegalSection>

      <LegalSection heading="What we do not collect">
        <p>
          We do not scan Gmail. We do not read your inbox. We do not connect a bank. We do not use
          Plaid. Card numbers go to Paddle, not to us.
        </p>
      </LegalSection>

      <LegalSection heading="Why we hold it">
        <p className="text-muted-foreground">
          To sign you in, show you your list, run keep / cut / pause, take the $14 once payment
          through Paddle, and answer mail you send to {CONTACT_EMAIL}. That is the whole job.
        </p>
      </LegalSection>

      <LegalSection heading="Who else sees it">
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Cloudflare hosts the app.</li>
          <li>Supabase holds auth and your rows, isolated to your account.</li>
          <li>
            Paddle.com is the merchant of record for paid orders. Paddle’s privacy terms cover
            checkout. Buyer support:{" "}
            {mobile ? <span>paddle.net</span> : <a
              href={PADDLE_BUYER_SUPPORT}
              className="underline-offset-4 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              paddle.net
            </a>}
            .
          </li>
        </ul>
        <p>We do not sell your list. We do not sell your email.</p>
      </LegalSection>

      <LegalSection heading="How long">
        <p className="text-muted-foreground">
          Rows stay while the account stays. Write {CONTACT_EMAIL} and we will delete the account
          and the list. Backups may lag a short time. Magic-link mail is not kept as a permanent
          archive.
        </p>
      </LegalSection>

      <LegalSection heading="The mobile companions">
        <p className="text-muted-foreground">
          The iOS and Android apps use the same account and inventory. The iOS app stores sign-in tokens
          and your reminder preference in device-only Keychain storage. The Android app protects saved
          sign-in tokens using Android Keystore-backed encryption. Optional reminders are scheduled on your device;
          their notification text contains no tool names or amounts. Signing out removes the saved
          session and reminders. Sample preview does not upload its sample rows.
        </p>
        <p className="text-muted-foreground">
          You can delete your account inside the app from Account → Delete account. This removes
          your account, inventory and access profile across devices. Backups may take a short time
          to expire, and payment processors may retain records required by law. You can also request deletion
          without installing the app at <a href="/delete-account" className="underline">ritestack.app/delete-account</a>. The mobile apps contain
          no advertising, tracking or third-party analytics SDK.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p className="text-muted-foreground">
          Sign-in uses a session cookie so the ritual can load. There is no ad pixel and no
          third-party marketing cookie on this site.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask for a copy, a correction, or deletion. Email {CONTACT_EMAIL}. If you live
          somewhere with extra privacy law (including the EU/UK), those rights still apply. We will
          answer from the UAE.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

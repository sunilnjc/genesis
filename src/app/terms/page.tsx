import type { Metadata } from "next"
import {
  CONTACT_EMAIL,
  LEGAL_NAME,
  OPERATING_NAME,
  OPERATOR_LINE,
  PADDLE_MOR_NOTICE,
  PRODUCT_NAME,
  PRODUCT_URL,
} from "@/lib/legal"
import { LegalPage, LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Terms · RiteStack",
  description:
    "Terms for RiteStack, operated by Sunilkumar Kalabandi. 7 days full ritual. Then $14 once.",
}

export default function TermsPage() {
  return (
    <LegalPage
      screen="terms"
      title="Terms"
      lede={`${OPERATOR_LINE} These terms cover ${PRODUCT_NAME} at ${PRODUCT_URL.replace("https://", "")}.`}
    >
      <LegalSection heading="Who we are">
        <p>
          {OPERATING_NAME} is operated by {LEGAL_NAME}, an individual in the United Arab Emirates.
          The public business name is {OPERATING_NAME}. There is no company registration behind
          this site. The legal name on this page is {LEGAL_NAME}.
        </p>
        <p className="text-muted-foreground">
          Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What you get">
        <p>
          {PRODUCT_NAME} is a keep / cut / pause ritual for the AI and dev tools you already pay
          for. You add the names. Each row can carry a cost, a renew date, last-used, and a cancel
          URL. Inventory is the list. The ritual is the product.
        </p>
        <p className="text-muted-foreground">
          After you sign in with a magic link, keep / cut / pause is unlocked for seven days. Then
          the ritual is $14 once. Looking at your stack stays free. That $14 is this ritual — not a
          subscription, not a monthly plan, not a lifetime pass to every future feature.
        </p>
        <p className="text-muted-foreground">
          We do not scan Gmail. We do not connect a bank. We do not use Plaid. You type the tools.
        </p>
      </LegalSection>

      <LegalSection heading="How you pay">
        <p>{PADDLE_MOR_NOTICE}</p>
        <p className="text-muted-foreground">
          Checkout is $14 once for digital access to the ritual on your account. Tax may be added
          by Paddle where the law requires it. Card details are collected by Paddle, not by us.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You sign in with the email we send a link to. The list under that email is yours. Do not
          share the link. If you lose access, write {CONTACT_EMAIL}.
        </p>
        <p className="text-muted-foreground">
          You are responsible for the names, amounts, and cancel URLs you store. We do not cancel
          tools for you.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Use {PRODUCT_NAME} for your own stack. Do not probe other people’s accounts, scrape the
          service, or use it to send abuse. We may close an account that breaks this.
        </p>
      </LegalSection>

      <LegalSection heading="Availability">
        <p className="text-muted-foreground">
          The ritual is a small web app. We try to keep it up. We do not promise it will never
          break, and we may change or retire a feature. Looking at the list staying free is the
          line we will not quietly take back.
        </p>
      </LegalSection>

      <LegalSection heading="Refunds">
        <p>
          Digital access is delivered when payment completes. How to get money back is on the{" "}
          <a href="/refund" className="underline-offset-4 hover:underline">
            Refund
          </a>{" "}
          page. Paddle handles returns as merchant of record.
        </p>
      </LegalSection>

      <LegalSection heading="Privacy">
        <p>
          What we keep, and what we do not, is on the{" "}
          <a href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </a>{" "}
          page.
        </p>
      </LegalSection>

      <LegalSection heading="Law">
        <p>
          These terms are governed by the laws of the United Arab Emirates, without limiting any
          consumer rights you have where you live. A purchase through Paddle is also subject to
          Paddle’s buyer terms.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

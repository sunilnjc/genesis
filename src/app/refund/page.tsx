import type { Metadata } from "next"
import {
  CONTACT_EMAIL,
  LEGAL_NAME,
  OPERATING_NAME,
  OPERATOR_LINE,
  PADDLE_BUYER_SUPPORT,
  PADDLE_MOR_NOTICE,
  PRODUCT_NAME,
  REFUND_WINDOW_DAYS,
} from "@/lib/legal"
import { LegalPage, LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Refund · RiteStack",
  description:
    "RiteStack is $14 once after 7 days. Write hello@ritestack.app within 14 days if you want the money back.",
}

export default function RefundPage() {
  return (
    <LegalPage
      screen="refund"
      title="Refund"
      lede={`${OPERATOR_LINE} ${PRODUCT_NAME} is a digital ritual. This is how money comes back.`}
    >
      <LegalSection heading="What you paid for">
        <p>
          {PRODUCT_NAME} is $14 once after seven days of the full keep / cut / pause ritual.
          Looking at your stack stays free. There is no file to return and nothing monthly to
          cancel.
        </p>
        <p className="text-muted-foreground">
          Access unlocks on your account when payment completes. That is the whole delivery.
        </p>
      </LegalSection>

      <LegalSection heading="Try it first">
        <p>
          You get seven days of the ritual after you sign in, before any $14 is due. If the sitting
          is not useful, do not pay. Inventory stays.
        </p>
      </LegalSection>

      <LegalSection heading={`${REFUND_WINDOW_DAYS} days — write ${CONTACT_EMAIL}`}>
        <p>
          If you paid and want the $14 back, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          within {REFUND_WINDOW_DAYS} days of the charge. Use the same address you paid with.
        </p>
        <p className="text-muted-foreground">
          If you have not used keep / cut / pause after paying, we refund. If you already ran the
          ritual, write anyway — we look at those one by one. We would rather send the money back
          than leave you with a charge you resent.
        </p>
        <p className="text-muted-foreground">
          {LEGAL_NAME} operates {OPERATING_NAME} and will pass the request to Paddle. Refunds go
          to the original payment method.
        </p>
      </LegalSection>

      <LegalSection heading="Paddle handles returns">
        <p>{PADDLE_MOR_NOTICE}</p>
        <p className="text-muted-foreground">
          You can also reach Paddle buyer support at{" "}
          <a
            href={PADDLE_BUYER_SUPPORT}
            className="underline-offset-4 hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            paddle.net
          </a>
          . Where the law gives you a longer right to withdraw, that right still applies.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

import type { Metadata } from "next"
import { RefundContent } from "@/components/refund-content"

export const metadata: Metadata = { title: "Refund · RiteStack", robots: { index: false, follow: false } }

export default function MobileRefundPage() {
  return <RefundContent mobile />
}

import type { Metadata } from "next"
import { RefundContent } from "@/components/refund-content"

export const metadata: Metadata = {
  title: "Refund · RiteStack",
  description:
    "RiteStack is $14 once after 7 days. Write hello@ritestack.app within 14 days if you want the money back.",
}


export default function RefundPage() {
  return <RefundContent />
}

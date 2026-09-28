import type { Metadata } from "next"
import { TermsContent } from "@/components/terms-content"

export const metadata: Metadata = {
  title: "Terms · RiteStack",
  description:
    "Terms for RiteStack, operated by Sunilkumar Kalabandi. 7 days full ritual. Then $14 once.",
}


export default function TermsPage() {
  return <TermsContent />
}

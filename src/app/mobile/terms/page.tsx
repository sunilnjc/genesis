import type { Metadata } from "next"
import { TermsContent } from "@/components/terms-content"

export const metadata: Metadata = { title: "Terms · RiteStack", robots: { index: false, follow: false } }

export default function MobileTermsPage() {
  return <TermsContent mobile />
}

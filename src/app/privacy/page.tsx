import type { Metadata } from "next"
import { PrivacyContent } from "@/components/privacy-content"

export const metadata: Metadata = {
  title: "Privacy · RiteStack",
  description:
    "Privacy for RiteStack. Operated by Sunilkumar Kalabandi. We do not scan Gmail or use Plaid.",
}


export default function PrivacyPage() {
  return <PrivacyContent />
}

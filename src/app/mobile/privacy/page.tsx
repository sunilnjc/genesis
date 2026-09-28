import type { Metadata } from "next"
import { PrivacyContent } from "@/components/privacy-content"

export const metadata: Metadata = { title: "Privacy · RiteStack", robots: { index: false, follow: false } }

export default function MobilePrivacyPage() {
  return <PrivacyContent mobile />
}

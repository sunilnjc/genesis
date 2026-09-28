import type { Metadata } from "next"
import { SupportContent } from "@/components/support-content"

export const metadata: Metadata = { title: "Support · RiteStack", robots: { index: false, follow: false } }

export default function MobileSupportPage() {
  return <SupportContent mobile />
}

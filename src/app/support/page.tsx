import type { Metadata } from "next"
import { SupportContent } from "@/components/support-content"

export const metadata: Metadata = {
  title: "Support · RiteStack",
  description: "Help with RiteStack sign-in, inventory, reminders and account deletion.",
}


export default function SupportPage() {
  return <SupportContent />
}

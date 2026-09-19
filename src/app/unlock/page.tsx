import type { Metadata } from "next"
import { UnlockApp } from "@/components/unlock-app"

export const metadata: Metadata = {
  title: "Unlock · RiteStack",
  description: "Pay the $14 RiteStack pack. Paddle Checkout during the 7-day trial.",
}

export default function UnlockPage() {
  return <UnlockApp />
}

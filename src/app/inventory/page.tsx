import type { Metadata } from "next"
import { HostedApp } from "@/components/hosted-app"

export const metadata: Metadata = {
  title: "Inventory · RiteStack",
  description: "Full list of tools you pay for. Add, edit, and see monthly burn.",
}

export default function InventoryPage() {
  return <HostedApp />
}

import type { Metadata } from "next"
import { GraveyardApp } from "@/components/graveyard-app"

export const metadata: Metadata = {
  title: "Inventory · RiteStack",
  description: "Full list of tools you pay for. Add, edit, and see monthly burn.",
}

export default function InventoryPage() {
  return <GraveyardApp />
}

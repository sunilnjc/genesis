import type { Metadata } from "next"
import { HostedApp } from "@/components/hosted-app"

export const metadata: Metadata = {
  title: "Cuts · RiteStack",
  description: "The tools you cut, when you cut them, and their cancel links.",
}

export default function CutsPage() {
  return <HostedApp />
}

import { notFound } from "next/navigation";
import { teamsEnabled } from "@/lib/teams/server";
import { TeamsApp } from "@/components/teams/teams-app";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Teams · RiteStack",
  robots: { index: false, follow: false },
};
export default function TeamsPage() {
  if (!teamsEnabled()) notFound();
  return <TeamsApp />;
}

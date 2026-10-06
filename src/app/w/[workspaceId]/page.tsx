import { notFound } from "next/navigation";
import { teamsEnabled } from "@/lib/teams/server";
import { TeamsApp } from "@/components/teams/teams-app";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Workspace · RiteStack",
  robots: { index: false, follow: false },
};
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  if (!teamsEnabled()) notFound();
  const { workspaceId } = await params;
  return <TeamsApp workspaceId={workspaceId} />;
}

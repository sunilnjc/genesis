import { randomBytes, createHash } from "node:crypto";
import {
  teamClient,
  TeamError,
  teamFailure,
  databaseError,
} from "@/lib/teams/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function GET(request: Request) {
  try {
    const client = await teamClient(request);
    const workspace = new URL(request.url).searchParams.get("workspace");
    const { data: workspaces, error } = await client
      .from("workspaces")
      .select("id,name,timezone")
      .order("created_at");
    if (error) databaseError(error);
    if (!workspace) return Response.json({ workspaces }, { headers });
    if (!workspaces?.some((w) => w.id === workspace))
      throw new TeamError("Workspace unavailable.", 403);
    const queries = [
      client
        .from("workspace_members")
        .select("user_id,role,display_name")
        .eq("workspace_id", workspace),
      client
        .from("team_subscriptions")
        .select("*")
        .eq("workspace_id", workspace)
        .is("archived_at", null)
        .order("renewal_date"),
      client
        .from("renewal_reviews")
        .select("*")
        .eq("workspace_id", workspace)
        .order("created_at", { ascending: false }),
      client
        .from("review_comments")
        .select("*")
        .eq("workspace_id", workspace)
        .order("created_at"),
      client.from("review_actions").select("*").eq("workspace_id", workspace),
      client
        .from("workspace_invitations")
        .select("id,email,role,expires_at,accepted_at,revoked_at")
        .eq("workspace_id", workspace),
      client
        .from("activity_events")
        .select("*")
        .eq("workspace_id", workspace)
        .order("created_at", { ascending: false })
        .limit(100),
      client
        .from("workspace_entitlements")
        .select("state,expires_at,member_limit")
        .eq("workspace_id", workspace),
    ];
    const results = await Promise.all(queries);
    for (const r of results) if (r.error) databaseError(r.error);
    return Response.json(
      {
        workspaces,
        ...Object.fromEntries(
          [
            "members",
            "tools",
            "reviews",
            "comments",
            "actions",
            "invitations",
            "activity",
            "entitlements",
          ].map((key, i) => [key, results[i].data]),
        ),
      },
      { headers },
    );
  } catch (error) {
    return teamFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      origin &&
      origin !== new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin
    )
      throw new TeamError("Cross-origin request rejected.", 403);
    const client = await teamClient(request);
    const text = await request.text();
    if (text.length > 16000) throw new TeamError("Request is too large.", 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new TeamError("Invalid request.", 400);
    }
    if (
      !body ||
      typeof body.action !== "string" ||
      typeof body.key !== "string" ||
      !body.data ||
      typeof body.data !== "object" ||
      Array.isArray(body.data)
    )
      throw new TeamError("Invalid command.", 400);
    let token: string | undefined;
    if (body.action === "invite") {
      token = randomBytes(32).toString("hex");
      body.data.token_hash = hash(token);
    }
    if (body.action === "accept_invite") {
      if (
        typeof body.data.token !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.data.token)
      )
        throw new TeamError("Invalid invitation.", 400);
      body.data = { token_hash: hash(body.data.token) };
    }
    const { data, error } = await client.rpc("team_command", {
      p_workspace: body.workspace ?? null,
      p_action: body.action,
      p_data: body.data,
      p_key: body.key,
    });
    if (error) databaseError(error);
    return Response.json(
      { ...data, ...(token ? { invitePath: `/teams#invite=${token}` } : {}) },
      { headers },
    );
  } catch (error) {
    return teamFailure(error);
  }
}

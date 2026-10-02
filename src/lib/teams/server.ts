import { createClient } from "@supabase/supabase-js";
import { jwtFromRequest } from "@/lib/billing-auth";
import { readPublicSupabaseEnv, assertNotJobPursuit } from "@/lib/auth/config";

export function teamsEnabled() {
  return process.env.TEAMS_ENABLED === "true";
}
export async function teamClient(request: Request) {
  if (!teamsEnabled()) throw new TeamError("Teams is not enabled.", 404);
  const { url, anonKey } = readPublicSupabaseEnv();
  assertNotJobPursuit(url);
  const jwt = jwtFromRequest(request);
  if (!jwt) throw new TeamError("Sign in to use your workspace.", 401);
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user?.email_confirmed_at)
    throw new TeamError("Sign in with a verified email.", 401);
  return client;
}
export class TeamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export function teamFailure(error: unknown) {
  const known = error instanceof TeamError;
  return Response.json(
    {
      error: known ? error.message : "Workspace request failed. Please retry.",
    },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export function databaseError(error: {
  code?: string;
  message: string;
}): never {
  if (error.code === "40001") throw new TeamError(error.message, 409);
  if (error.code === "42501") throw new TeamError(error.message, 403);
  if (error.code === "23505")
    throw new TeamError(
      "This record already exists. Refresh to see the latest state.",
      409,
    );
  if (error.code === "23503")
    throw new TeamError("Select an active member of this workspace.", 400);
  if (
    ["22023", "23514", "23502", "22P02", "22007", "22008"].includes(
      error.code ?? "",
    )
  )
    throw new TeamError(
      "Check the submitted fields. " +
        (error.code === "22023" ? error.message : ""),
      400,
    );
  throw new TeamError("Workspace data is unavailable. Please retry.", 503);
}

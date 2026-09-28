// Local-only destructive fixtures. Never points at a hosted project or sends email.
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(
  url,
  "http://127.0.0.1:57321",
  "Only the isolated Teams database is allowed",
);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const clients = {},
  users = {};
const password = "Teams-local-only-2026!";
for (const name of ["owner", "member", "other", "outsider", "unverified"]) {
  const email = `teams-${name}@example.invalid`;
  const { data: existing } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const previous = existing.users.find((u) => u.email === email);
  let user = previous;
  if (!user) {
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: name !== "unverified",
    });
    assert.ifError(result.error);
    user = result.data.user;
  }
  users[name] = user.id;
  const client = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options,
  );
  if (name !== "unverified") {
    const { error } = await client.auth.signInWithPassword({ email, password });
    assert.ifError(error);
  }
  clients[name] = client;
}
for (const name of ["owner", "other"])
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_genesis-teams",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `insert into public.team_pilot_accounts values ('${users[name]}') on conflict do nothing`,
    ],
    { stdio: "pipe" },
  );
let assertions = 0;
async function command(who, w, action, data, key = randomUUID()) {
  const result = await clients[who].rpc("team_command", {
    p_workspace: w,
    p_action: action,
    p_data: data,
    p_key: key,
  });
  assert.ifError(result.error);
  assertions++;
  return result.data;
}
async function denied(who, w, action, data, code) {
  const { error } = await clients[who].rpc("team_command", {
    p_workspace: w,
    p_action: action,
    p_data: data,
    p_key: randomUUID(),
  });
  assert.ok(error, `${action} should fail`);
  if (code) assert.equal(error.code, code);
  assertions++;
}
const a = (
  await command("owner", null, "create_workspace", {
    name: "Agency test " + randomUUID().slice(0, 5),
    timezone: "Asia/Dubai",
  })
).workspace_id;
const b = (
  await command("other", null, "create_workspace", {
    name: "Other workspace",
    timezone: "UTC",
  })
).workspace_id;
await denied(
  "outsider",
  null,
  "create_workspace",
  { name: "Unauthorized", timezone: "UTC" },
  "42501",
);
await denied(
  "owner",
  null,
  "create_workspace",
  { name: "Bad timezone", timezone: "Not/AZone" },
  "22023",
);
const token = randomUUID();
const hash = createHash("sha256").update(token).digest("hex");
await command("owner", a, "invite", {
  email: "teams-member@example.invalid",
  role: "member",
  token_hash: hash,
});
await denied("outsider", null, "accept_invite", { token_hash: hash }, "42501");
const accepted = await Promise.all([
  clients.member.rpc("team_command", {
    p_workspace: null,
    p_action: "accept_invite",
    p_data: { token_hash: hash },
    p_key: randomUUID(),
  }),
  clients.member.rpc("team_command", {
    p_workspace: null,
    p_action: "accept_invite",
    p_data: { token_hash: hash },
    p_key: randomUUID(),
  }),
]);
assert.equal(accepted.filter((r) => !r.error).length, 1);
assertions++;
await denied("member", null, "accept_invite", { token_hash: hash }, "42501");
await denied(
  "member",
  a,
  "invite",
  {
    email: "teams-outsider@example.invalid",
    role: "admin",
    token_hash: "a".repeat(64),
  },
  "42501",
);
await denied(
  "member",
  a,
  "set_role",
  { user_id: users.member, role: "admin" },
  "42501",
);
await denied("owner", a, "remove_member", { user_id: users.owner }, "42501");
const input = {
  name: "Design tool",
  owner_id: users.member,
  amount_minor: 15000,
  currency: "USD",
  interval_months: 1,
  seats: 10,
  renewal_date: "2026-10-31",
  cancellation_deadline: "2026-10-24",
};
const key = randomUUID();
const tool = await command("owner", a, "create_tool", input, key);
assert.deepEqual(await command("owner", a, "create_tool", input, key), tool);
const cross = await clients.member.from("workspaces").select("id").eq("id", b);
assert.deepEqual(cross.data, []);
assertions++;
await denied("other", a, "create_tool", input, "42501");
await denied(
  "owner",
  a,
  "create_tool",
  { ...input, owner_id: users.other },
  "23503",
);
const hidden = await command("owner", a, "create_tool", {
  ...input,
  name: "Private tool",
  owner_id: users.owner,
});
const read = await clients.member
  .from("team_subscriptions")
  .select("id")
  .eq("workspace_id", a);
assert.deepEqual(
  read.data.map((t) => t.id),
  [tool.id],
);
assertions++;
const direct = await clients.member
  .from("workspace_members")
  .update({ role: "owner" })
  .eq("workspace_id", a);
assert.ok(direct.error);
assertions++;
await command("owner", a, "update_tool", {
  ...input,
  id: tool.id,
  version: 1,
  name: "Updated tool",
});
await denied(
  "owner",
  a,
  "update_tool",
  { ...input, id: tool.id, version: 1 },
  "40001",
);
const review = await command("owner", a, "open_review", { id: tool.id });
await denied("member", a, "approve", { id: review.id, version: 1 }, "42501");
await denied("owner", a, "approve", { id: review.id, version: 1 }, "22023");
await denied(
  "owner",
  a,
  "recommend",
  {
    id: review.id,
    version: 1,
    decision: "reduce",
    proposed_minor: 10500,
    proposed_seats: 7,
    reason: "Owner required",
  },
  "42501",
);
await command("member", a, "recommend", {
  id: review.id,
  version: 1,
  decision: "reduce",
  proposed_minor: 10500,
  proposed_seats: 7,
  reason: "Only seven seats needed",
});
await command("owner", a, "return_review", {
  id: review.id,
  version: 2,
  reason: "Confirm which seats",
});
await command("member", a, "recommend", {
  id: review.id,
  version: 3,
  decision: "reduce",
  proposed_minor: 10500,
  proposed_seats: 7,
  reason: "Three unused seats confirmed",
});
await command("owner", a, "approve", {
  id: review.id,
  version: 4,
  executor_id: users.owner,
});
await denied(
  "member",
  a,
  "complete",
  {
    id: review.id,
    version: 5,
    outcome: "Not permitted",
    effective_date: "2026-10-31",
    after_minor: 10500,
  },
  "42501",
);
await command("owner", a, "complete", {
  id: review.id,
  version: 5,
  outcome: "Vendor confirmed seven seats",
  effective_date: "2026-10-31",
  after_minor: 10500,
});
await denied(
  "owner",
  a,
  "complete",
  {
    id: review.id,
    version: 5,
    outcome: "Replay",
    effective_date: "2026-10-31",
    after_minor: 10500,
  },
  "40001",
);
const result = await clients.owner
  .from("review_actions")
  .select("*")
  .eq("review_id", review.id);
assert.equal(result.data.length, 1);
assert.equal(result.data[0].before_minor - result.data[0].after_minor, 4500);
assertions++;
const privateReview = await command("owner", a, "open_review", {
  id: hidden.id,
});
await denied(
  "member",
  a,
  "comment",
  { id: privateReview.id, body: "Should be hidden" },
  "42501",
);
await command("owner", a, "remove_member", { user_id: users.member });
const revoked = await clients.member
  .from("team_subscriptions")
  .select("*")
  .eq("workspace_id", a);
assert.deepEqual(revoked.data, []);
assertions++;
await denied(
  "member",
  a,
  "comment",
  { id: review.id, body: "Access revoked" },
  "42501",
);
const unassigned = await clients.owner
  .from("team_subscriptions")
  .select("owner_id")
  .eq("id", tool.id)
  .single();
assert.equal(unassigned.data.owner_id, null);
assertions++;
for (const decision of ["keep", "pause", "cancel"]) {
  const t = await command("owner", a, "create_tool", {
    ...input,
    owner_id: users.owner,
    name: decision,
  });
  const r = await command("owner", a, "open_review", { id: t.id });
  await command("owner", a, "recommend", {
    id: r.id,
    version: 1,
    decision,
    proposed_minor: decision === "keep" ? 15000 : 0,
    proposed_seats: decision === "keep" ? 10 : 0,
    reason: "Testing " + decision,
  });
  await command("owner", a, "approve", {
    id: r.id,
    version: 2,
    executor_id: users.owner,
  });
  if (decision !== "keep")
    await command("owner", a, "complete", {
      id: r.id,
      version: 3,
      outcome: "Confirmed " + decision,
      effective_date: "2026-10-31",
      after_minor: 0,
    });
  const { data } = await clients.owner
    .from("renewal_reviews")
    .select("state")
    .eq("id", r.id)
    .single();
  assert.equal(data.state, "completed");
  assertions++;
}
for (const mode of ["expired", "revoked"]) {
  const tokenHash = createHash("sha256").update(randomUUID()).digest("hex");
  const i = await command("owner", a, "invite", {
    email: "teams-outsider@example.invalid",
    role: "member",
    token_hash: tokenHash,
  });
  if (mode === "revoked")
    await command("owner", a, "revoke_invite", { id: i.id });
  else
    execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_genesis-teams",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-c",
        `update public.workspace_invitations set expires_at=now()-interval '1 day' where id='${i.id}'`,
      ],
      { stdio: "pipe" },
    );
  await denied(
    "outsider",
    null,
    "accept_invite",
    { token_hash: tokenHash },
    "42501",
  );
}
// Imports commit together; a bad later row must roll back the first.
const importKey=randomUUID();
await command('owner',a,'import_tools',{rows:[{...input,name:'Imported A'},{...input,name:'Imported B'}].map(r=>({...r,owner_id:users.owner}))},importKey);
await command('owner',a,'import_tools',{rows:[{...input,name:'Imported A'},{...input,name:'Imported B'}].map(r=>({...r,owner_id:users.owner}))},importKey);
await denied('owner',a,'import_tools',{rows:[{...input,name:'Rollback A',owner_id:users.owner},{...input,name:'Invalid B',owner_id:users.other}]},'23503');
const rollback=await clients.owner.from('team_subscriptions').select('id').eq('workspace_id',a).eq('name','Rollback A');assert.deepEqual(rollback.data,[]);assertions++;
await denied('owner',a,'import_tools',{rows:[{...input,name:'Imported A',owner_id:users.owner}]},'23505');
const audit=await clients.owner.from('activity_events').delete().eq('workspace_id',a);assert.ok(audit.error);assertions++;
// Restore member for browser journey; these are local fixtures only.
const browserInvite = await command("owner", a, "invite", {
  email: "teams-member@example.invalid",
  role: "member",
  token_hash: createHash("sha256").update(randomUUID()).digest("hex"),
});
const newInvite = await clients.owner
  .from("workspace_invitations")
  .select("token_hash")
  .eq("id", browserInvite.id)
  .single();
await command("member", null, "accept_invite", {
  token_hash: newInvite.data.token_hash,
});
fs.writeFileSync(
  ".env.teams-fixtures.json",
  JSON.stringify({ workspace: a, otherWorkspace: b, users, password }),
  { mode: 0o600 },
);
console.log(
  `PASS: ${assertions} local Teams checks (isolation, roles, invite race/replay/expiry/revocation, conflicts, all decision paths, removal, and completed savings).`,
);

"use client";
import Link from "next/link";
import { CsvImport } from "@/components/teams/csv-import";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  CURRENCY_DIGITS,
  minorUnits,
  money,
  decimalAmount,
  calendarToday,
  type Currency,
} from "@/lib/teams/domain";

type Workspace = { id: string; name: string; timezone: string };
type Member = { user_id: string; role: string; display_name: string };
type Tool = {
  id: string;
  name: string;
  owner_id: string | null;
  amount_minor: number;
  currency: Currency;
  interval_months: number;
  seats: number;
  renewal_date: string;
  cancellation_deadline: string | null;
  version: number;
};
type Review = {
  id: string;
  subscription_id: string;
  state: string;
  decision: string | null;
  reason: string | null;
  decision_deadline: string;
  proposed_minor: number | null;
  before_minor: number;
  currency: Currency;
  interval_months: number;
  version: number;
  executor_id: string | null;
};
type Snapshot = {
  workspaces: Workspace[];
  members?: Member[];
  tools?: Tool[];
  reviews?: Review[];
  comments?: { id: string; review_id: string; body: string }[];
  actions?: {
    id: string;
    effective_date: string;
    before_minor: number;
    after_minor: number;
    currency: Currency;
    interval_months: number;
  }[];
  invitations?: {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  }[];
  activity?: { id: string; event: string; created_at: string }[];
  entitlements?: { state: string; expires_at: string }[];
};
const inputStyle =
  "w-full rounded-lg border border-white/20 bg-black/20 p-2.5 text-sm";
const buttonStyle =
  "rounded-lg bg-amber-200 px-4 py-2 text-sm font-medium text-black disabled:opacity-40";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-white/80">
      {label}
      {children}
    </label>
  );
}
function form(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget)) as Record<
    string,
    string
  >;
}

export function TeamsApp({ workspaceId }: { workspaceId?: string }) {
  const auth = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot>({ workspaces: [] });
  const [loadedFor, setLoadedFor] = useState("");
  const [tab, setTab] = useState("Decide");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [editing, setEditing] = useState<Tool | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const jwt = auth.session?.access_token;
  const load = useCallback(async () => {
    if (!jwt) return;
    try {
      const response = await fetch(
        "/api/workspaces" + (workspaceId ? `?workspace=${workspaceId}` : ""),
        { headers: { Authorization: `Bearer ${jwt}` } },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setSnapshot(data);
      setLoadedFor(`${auth.userId}:${workspaceId ?? ""}`);
    } catch (e) {
      setSnapshot({ workspaces: [] });
      setError(e instanceof Error ? e.message : "Could not load workspace.");
      setLoadedFor(`${auth.userId}:${workspaceId ?? ""}`);
    } finally {
      setLoading(false);
    }
  }, [jwt, workspaceId, auth.userId]);
  // Fetch resolves asynchronously; synchronize the authenticated workspace snapshot.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "invite",
    );
    if (token) {
      sessionStorage.setItem("ritestack-team-invite", token);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // The invitation is external browser state, unavailable during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvite(sessionStorage.getItem("ritestack-team-invite") ?? "");
  }, []);
  async function command(
    action: string,
    data: Record<string, unknown>,
    workspace = workspaceId,
    requestKey = crypto.randomUUID(),
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace,
          action,
          data,
          key: requestKey,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      if (result.invitePath)
        setInviteLink(new URL(result.invitePath, window.location.origin).href);
      if (action === "accept_invite") {
        sessionStorage.removeItem("ritestack-team-invite");
        setInvite("");
      }
      if (action === "create_workspace" || action === "accept_invite") {
        router.push(`/w/${result.workspace_id}`);
        return;
      }
      if (action === "archive_workspace") {
        router.push("/teams");
        return;
      }
      setEditing(null);
      setNotice("Saved.");
      await load();
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save failed. Refresh to check whether it completed before retrying.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function saveTool(event: FormEvent<HTMLFormElement>) {
    const values = form(event);
    try {
      void command(editing ? "update_tool" : "create_tool", {
        ...values,
        amount_minor: minorUnits(values.amount, currency),
        currency,
        ...(editing ? { id: editing.id, version: editing.version } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const workspace = snapshot.workspaces.find((w) => w.id === workspaceId);
  const role = snapshot.members?.find((m) => m.user_id === auth.userId)?.role;
  const admin = role === "owner" || role === "admin";
  const tools = snapshot.tools ?? [];
  const openReviews = (snapshot.reviews ?? []).filter(
    (r) => !["completed", "superseded", "cancelled"].includes(r.state),
  );
  const today = calendarToday(workspace?.timezone ?? "UTC");
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 text-white sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
        <div>
          <Link href="/teams" className="font-serif text-3xl">
            RiteStack <span className="text-amber-200">Teams</span>
          </Link>
          <p className="mt-1 text-sm text-white/60">
            Every renewal has an owner.
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/">Personal workspace</Link>
          <Link href="/teams">Switch workspace</Link>
          {jwt && <button onClick={() => void auth.signOut()}>Sign out</button>}
        </nav>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-400/60 p-4"
        >
          {error}{" "}
          <button
            className="underline"
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Refresh latest data
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="mb-4 text-amber-200">
          {notice}
        </p>
      )}
      {auth.status === "loading" ? (
        <p>Checking your session…</p>
      ) : !jwt ? (
        <section className="max-w-md space-y-4">
          <h1 className="text-2xl">Sign in to Teams</h1>
          <p className="text-white/65">
            Use the verified email on your invitation. Your personal
            subscriptions stay in your personal workspace.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              const values = form(e);
              if (!auth.supabase) {
                setError("Sign-in is unavailable.");
                return;
              }
              setBusy(true);
              const { error } = await auth.supabase.auth.signInWithOtp({
                email: values.email,
                options: {
                  emailRedirectTo: new URL(
                    "/auth/callback?next=/teams",
                    location.origin,
                  ).href,
                },
              });
              setBusy(false);
              if (error) setError(error.message);
              else setNotice("Check your email for the sign-in link.");
            }}
          >
            <Field label="Email">
              <input
                className={inputStyle}
                name="email"
                type="email"
                required
              />
            </Field>
            <button className={buttonStyle} disabled={busy}>
              Email sign-in link
            </button>
          </form>
        </section>
      ) : (
        <>
          {invite && (
            <section className="mb-6 rounded-xl border border-amber-200/50 p-5">
              <h2 className="text-xl">Join an invited workspace</h2>
              <p className="my-3 text-sm">
                Accept as {auth.email}. The invitation must match this verified
                email.
              </p>
              <button
                className={buttonStyle}
                disabled={busy}
                onClick={() => void command("accept_invite", { token: invite })}
              >
                Accept invitation
              </button>
            </section>
          )}
          {loading || loadedFor !== `${auth.userId}:${workspaceId ?? ""}` ? (
            <p role="status">Loading workspace…</p>
          ) : !workspaceId ? (
            <div className="grid gap-8 md:grid-cols-2">
              <section>
                <h1 className="mb-4 text-2xl">Your workspaces</h1>
                {snapshot.workspaces.length ? (
                  snapshot.workspaces.map((w) => (
                    <Link
                      key={w.id}
                      href={`/w/${w.id}`}
                      className="mb-3 block rounded-xl border border-white/15 p-4"
                    >
                      {w.name} →
                    </Link>
                  ))
                ) : (
                  <p className="text-white/60">
                    No team workspace yet. Accept an invitation or create a
                    pilot workspace.
                  </p>
                )}
              </section>
              <section>
                <h2 className="mb-4 text-xl">Create a workspace</h2>
                <p className="mb-4 text-sm text-white/60">
                  Available to invited pilot owners. Includes a 30-day pilot; no
                  payment is collected.
                </p>
                <form
                  className="space-y-3"
                  onSubmit={(e) => void command("create_workspace", form(e))}
                >
                  <Field label="Workspace name">
                    <input
                      className={inputStyle}
                      name="name"
                      maxLength={80}
                      required
                    />
                  </Field>
                  <Field label="Timezone">
                    <input
                      className={inputStyle}
                      name="timezone"
                      defaultValue={
                        Intl.DateTimeFormat().resolvedOptions().timeZone
                      }
                      required
                    />
                  </Field>
                  <button className={buttonStyle} disabled={busy}>
                    Create workspace
                  </button>
                </form>
              </section>
            </div>
          ) : workspace ? (
            <>
              <div className="mb-5">
                <h1 className="text-3xl">{workspace.name}</h1>
                <p className="mt-1 text-sm text-white/60">
                  {role} · {workspace.timezone} ·{" "}
                  {snapshot.entitlements?.[0]?.state} access until{" "}
                  {snapshot.entitlements?.[0]?.expires_at.slice(0, 10)}
                </p>
              </div>
              <nav
                className="mb-6 flex flex-wrap gap-2"
                aria-label="Workspace sections"
              >
                {["Decide", "Inventory", "Team", "Results", "Settings"].map(
                  (name) => (
                    <button
                      key={name}
                      className={`rounded-full px-4 py-2 text-sm ${tab === name ? "bg-amber-200 text-black" : "border border-white/20"}`}
                      aria-pressed={tab === name}
                      onClick={() => setTab(name)}
                    >
                      {name}
                    </button>
                  ),
                )}
              </nav>
              {tab === "Decide" && (
                <section className="space-y-4">
                  <h2 className="text-xl">Renewal reviews</h2>
                  <p className="text-sm text-white/60">
                    {tools.filter((t) => !t.owner_id).length} tools need an
                    owner. Approved changes need vendor confirmation before they
                    count as completed.
                  </p>
                  {!openReviews.length && (
                    <p className="rounded-xl border border-white/15 p-6 text-white/60">
                      No open reviews. Open a review from Inventory to ask an
                      owner for a decision.
                    </p>
                  )}
                  {openReviews.map((r) => {
                    const tool = tools.find((t) => t.id === r.subscription_id);
                    return (
                      <article
                        key={r.id}
                        className="space-y-4 rounded-xl border border-white/20 p-5"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <h3 className="text-xl">{tool?.name}</h3>
                          <span className="text-sm text-amber-200">
                            {r.state.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-white/65">
                          Decision due {r.decision_deadline}
                          {r.decision_deadline < today
                            ? " · Overdue — confirm vendor cancellation terms"
                            : ""}{" "}
                          · {money(r.before_minor, r.currency)} /{" "}
                          {r.interval_months} month(s)
                        </p>
                        {r.reason && (
                          <p>
                            {r.decision}: {r.reason}
                            {r.proposed_minor !== null
                              ? ` · Proposed ${money(r.proposed_minor, r.currency)}`
                              : ""}
                          </p>
                        )}
                        {r.state === "awaiting_owner" &&
                          tool?.owner_id === auth.userId && (
                            <form
                              className="grid gap-3 sm:grid-cols-2"
                              onSubmit={(e) => {
                                const d = form(e);
                                try {
                                  void command("recommend", {
                                    ...d,
                                    id: r.id,
                                    version: r.version,
                                    proposed_minor: minorUnits(
                                      d.amount,
                                      r.currency,
                                    ),
                                  });
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              <Field label="Recommendation">
                                <select name="decision" className={inputStyle}>
                                  {["keep", "reduce", "pause", "cancel"].map(
                                    (d) => (
                                      <option key={d}>{d}</option>
                                    ),
                                  )}
                                </select>
                              </Field>
                              <Field
                                label={`Proposed charge (${r.currency}) per billing interval`}
                              >
                                <input
                                  name="amount"
                                  className={inputStyle}
                                  defaultValue={decimalAmount(
                                    r.before_minor,
                                    r.currency,
                                  )}
                                  required
                                />
                              </Field>
                              <Field label="Seats needed">
                                <input
                                  name="proposed_seats"
                                  className={inputStyle}
                                  type="number"
                                  min={0}
                                  max={tool.seats}
                                  defaultValue={tool.seats}
                                  required
                                />
                              </Field>
                              <Field label="Reason">
                                <input
                                  name="reason"
                                  className={inputStyle}
                                  maxLength={2000}
                                  required
                                />
                              </Field>
                              <button className={buttonStyle} disabled={busy}>
                                Submit recommendation
                              </button>
                            </form>
                          )}
                        {r.state === "awaiting_approval" && admin && (
                          <div className="flex flex-wrap gap-4">
                            <button
                              disabled={busy}
                              className={buttonStyle}
                              onClick={() =>
                                void command("approve", {
                                  id: r.id,
                                  version: r.version,
                                  executor_id: auth.userId,
                                })
                              }
                            >
                              {r.decision === "keep"
                                ? "Approve keep"
                                : "Approve — I will execute"}
                            </button>
                            <form
                              className="flex flex-wrap gap-2"
                              onSubmit={(e) =>
                                void command("return_review", {
                                  ...form(e),
                                  id: r.id,
                                  version: r.version,
                                })
                              }
                            >
                              <input
                                name="reason"
                                aria-label="Clarification needed"
                                placeholder="What needs clarification?"
                                className={inputStyle}
                                required
                                maxLength={2000}
                              />
                              <button className={buttonStyle} disabled={busy}>
                                Return to owner
                              </button>
                            </form>
                          </div>
                        )}
                        {r.state === "awaiting_execution" &&
                          r.executor_id === auth.userId && (
                            <form
                              className="grid gap-3 sm:grid-cols-2"
                              onSubmit={(e) => {
                                const d = form(e);
                                try {
                                  void command("complete", {
                                    ...d,
                                    id: r.id,
                                    version: r.version,
                                    after_minor: minorUnits(
                                      d.amount,
                                      r.currency,
                                    ),
                                  });
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              <p className="sm:col-span-2 text-sm text-white/65">
                                Make the change at the vendor first. Recording
                                this does not cancel or change a vendor
                                subscription.
                              </p>
                              <Field label="Vendor change completed">
                                <input
                                  className={inputStyle}
                                  name="outcome"
                                  required
                                  maxLength={2000}
                                />
                              </Field>
                              <Field label="Effective date">
                                <input
                                  className={inputStyle}
                                  name="effective_date"
                                  type="date"
                                  required
                                />
                              </Field>
                              <Field
                                label={`Confirmed new charge (${r.currency})`}
                              >
                                <input
                                  className={inputStyle}
                                  name="amount"
                                  required
                                />
                              </Field>
                              <button className={buttonStyle} disabled={busy}>
                                Record vendor outcome
                              </button>
                            </form>
                          )}
                        {(snapshot.comments ?? [])
                          .filter((c) => c.review_id === r.id)
                          .map((c) => (
                            <p
                              key={c.id}
                              className="border-l border-white/25 pl-3 text-sm"
                            >
                              {c.body}
                            </p>
                          ))}
                        <form
                          className="flex gap-2"
                          onSubmit={(e) =>
                            void command("comment", { ...form(e), id: r.id })
                          }
                        >
                          <input
                            className={inputStyle}
                            name="body"
                            aria-label="Comment"
                            placeholder="Add a comment"
                            maxLength={2000}
                            required
                          />
                          <button className={buttonStyle} disabled={busy}>
                            Comment
                          </button>
                        </form>
                      </article>
                    );
                  })}
                </section>
              )}
              {tab === "Inventory" && (
                <section className="space-y-5">
                  <h2 className="text-xl">Shared inventory</h2>
                  {admin && (
                    <CsvImport
                      tools={tools}
                      members={snapshot.members ?? []}
                      busy={busy}
                      onImport={async (rows, key) =>
                        Boolean(
                          await command(
                            "import_tools",
                            { rows },
                            workspaceId,
                            key,
                          ),
                        )
                      }
                    />
                  )}
                  {admin && (
                    <form
                      key={editing?.id ?? "new"}
                      className="grid gap-3 rounded-xl border border-white/20 p-5 sm:grid-cols-2"
                      onSubmit={saveTool}
                    >
                      <h3 className="text-lg sm:col-span-2">
                        {editing
                          ? "Edit tool — open reviews will be superseded"
                          : "Add a tool"}
                      </h3>
                      <Field label="Tool name">
                        <input
                          name="name"
                          className={inputStyle}
                          defaultValue={editing?.name}
                          required
                          maxLength={120}
                        />
                      </Field>
                      <Field label="Responsible owner">
                        <select
                          name="owner_id"
                          className={inputStyle}
                          defaultValue={editing?.owner_id ?? ""}
                        >
                          <option value="">Needs assignment</option>
                          {snapshot.members?.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.display_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Currency">
                        <select
                          className={inputStyle}
                          value={currency}
                          onChange={(e) =>
                            setCurrency(e.target.value as Currency)
                          }
                        >
                          {Object.keys(CURRENCY_DIGITS).map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Actual charge per interval">
                        <input
                          name="amount"
                          className={inputStyle}
                          defaultValue={
                            editing
                              ? decimalAmount(
                                  editing.amount_minor,
                                  editing.currency,
                                )
                              : ""
                          }
                          required
                        />
                      </Field>
                      <Field label="Billing interval">
                        <select
                          name="interval_months"
                          className={inputStyle}
                          defaultValue={editing?.interval_months ?? 1}
                        >
                          {[1, 3, 6, 12].map((m) => (
                            <option key={m} value={m}>
                              {m} month(s)
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Purchased seats">
                        <input
                          name="seats"
                          className={inputStyle}
                          type="number"
                          min={1}
                          max={100000}
                          defaultValue={editing?.seats ?? 1}
                          required
                        />
                      </Field>
                      <Field label="Next renewal">
                        <input
                          name="renewal_date"
                          className={inputStyle}
                          type="date"
                          defaultValue={editing?.renewal_date}
                          required
                        />
                      </Field>
                      <Field label="Cancellation deadline (leave blank if unknown)">
                        <input
                          name="cancellation_deadline"
                          className={inputStyle}
                          type="date"
                          defaultValue={editing?.cancellation_deadline ?? ""}
                        />
                      </Field>
                      <button className={buttonStyle} disabled={busy}>
                        {editing ? "Save tool" : "Add tool"}
                      </button>
                      {editing && (
                        <button type="button" onClick={() => setEditing(null)}>
                          Cancel edit
                        </button>
                      )}
                    </form>
                  )}
                  {!tools.length && (
                    <p className="text-white/60">No tools assigned here yet.</p>
                  )}
                  {tools.map((t) => (
                    <article
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/15 p-4"
                    >
                      <div>
                        <h3 className="text-lg">{t.name}</h3>
                        <p className="text-sm text-white/60">
                          {money(t.amount_minor, t.currency)} /{" "}
                          {t.interval_months} month(s) · {t.seats} seats ·
                          Renews {t.renewal_date}
                        </p>
                        <p className="text-sm text-white/60">
                          {t.owner_id
                            ? (snapshot.members?.find(
                                (m) => m.user_id === t.owner_id,
                              )?.display_name ?? "Assigned owner")
                            : "Needs owner"}{" "}
                          ·{" "}
                          {t.cancellation_deadline
                            ? `Cancel by ${t.cancellation_deadline}`
                            : "Cancellation terms unknown"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          className={buttonStyle}
                          disabled={busy}
                          onClick={() => {
                            void command("open_review", { id: t.id });
                            setTab("Decide");
                          }}
                        >
                          Open review
                        </button>
                        {admin && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(t);
                                setCurrency(t.currency);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                void command("archive_tool", {
                                  id: t.id,
                                  version: t.version,
                                })
                              }
                            >
                              Archive
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              )}
              {tab === "Team" && (
                <section className="space-y-5">
                  <h2 className="text-xl">Workspace members</h2>
                  {!admin && (
                    <p className="text-white/60">
                      Members see their own membership and assigned tools.
                      Contact your administrator for team changes.
                    </p>
                  )}
                  {snapshot.members?.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex flex-wrap justify-between gap-3 rounded-lg border border-white/15 p-4"
                    >
                      <span>
                        {m.display_name} · {m.role}
                      </span>
                      {admin &&
                        m.role !== "owner" &&
                        (role === "owner" || m.role === "member") && (
                          <div className="flex gap-4">
                            {role === "owner" && (
                              <button
                                onClick={() =>
                                  void command("set_role", {
                                    user_id: m.user_id,
                                    role:
                                      m.role === "admin" ? "member" : "admin",
                                  })
                                }
                                disabled={busy}
                              >
                                {m.role === "admin"
                                  ? "Make member"
                                  : "Make admin"}
                              </button>
                            )}
                            <button
                              disabled={busy}
                              onClick={() =>
                                void command("remove_member", {
                                  user_id: m.user_id,
                                })
                              }
                            >
                              Remove access
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                  {admin && (
                    <>
                      <form
                        className="grid max-w-lg gap-3"
                        onSubmit={(e) => void command("invite", form(e))}
                      >
                        <h3 className="text-lg">Invite a colleague</h3>
                        <Field label="Verified email address">
                          <input
                            type="email"
                            name="email"
                            required
                            className={inputStyle}
                          />
                        </Field>
                        <Field label="Role">
                          <select name="role" className={inputStyle}>
                            <option value="member">
                              Member — assigned tools only
                            </option>
                            {role === "owner" && (
                              <option value="admin">Administrator</option>
                            )}
                          </select>
                        </Field>
                        <button className={buttonStyle} disabled={busy}>
                          Create invitation link
                        </button>
                        <p className="text-sm text-white/60">
                          Share the link with this colleague. No email is sent
                          in this pilot build. Links expire after 7 days.
                        </p>
                      </form>
                      {inviteLink && (
                        <Field label="Copy this invitation link">
                          <input
                            className={inputStyle}
                            readOnly
                            value={inviteLink}
                            onFocus={(e) => e.target.select()}
                          />
                        </Field>
                      )}
                      {snapshot.invitations
                        ?.filter((i) => !i.accepted_at && !i.revoked_at)
                        .map((i) => (
                          <div
                            key={i.id}
                            className="flex flex-wrap justify-between gap-3 border-b border-white/15 pb-3"
                          >
                            <span>
                              {i.email} · {i.role} · Expires{" "}
                              {i.expires_at.slice(0, 10)}
                            </span>
                            <button
                              disabled={busy}
                              onClick={() =>
                                void command("revoke_invite", { id: i.id })
                              }
                            >
                              Revoke invitation
                            </button>
                          </div>
                        ))}
                    </>
                  )}
                </section>
              )}
              {tab === "Results" && (
                <section className="space-y-4">
                  <h2 className="text-xl">Recorded outcomes</h2>
                  <p className="text-white/60">
                    Run-rate reductions per billing interval, not realized cash
                    savings. Currencies remain separate.
                  </p>
                  <h3>Approved potential reductions</h3>
                  {openReviews
                    .filter((r) => r.state === "awaiting_execution")
                    .map((r) => (
                      <p key={r.id}>
                        {tools.find((t) => t.id === r.subscription_id)?.name}:{" "}
                        {money(
                          r.before_minor - (r.proposed_minor ?? r.before_minor),
                          r.currency,
                        )}{" "}
                        / {r.interval_months} month(s) · awaiting vendor action
                      </p>
                    ))}
                  <h3>Completed vendor changes</h3>
                  {!snapshot.actions?.length && (
                    <p className="text-white/60">
                      No completed vendor changes yet.
                    </p>
                  )}
                  {snapshot.actions?.map((a) => (
                    <p key={a.id}>
                      {money(a.before_minor - a.after_minor, a.currency)} /{" "}
                      {a.interval_months} month(s) ·{" "}
                      {a.effective_date <= today
                        ? "Effective"
                        : "Scheduled for"}{" "}
                      {a.effective_date}
                    </p>
                  ))}
                </section>
              )}
              {tab === "Settings" && (
                <section className="space-y-4">
                  <h2 className="text-xl">Workspace settings</h2>
                  <p>
                    Your personal purchases are separate from this workspace
                    pilot.
                  </p>
                  {admin && (
                    <>
                      <h3>Activity</h3>
                      {snapshot.activity?.map((a) => (
                        <p key={a.id} className="text-sm text-white/65">
                          {a.created_at.slice(0, 16).replace("T", " ")} UTC ·{" "}
                          {a.event.replaceAll("_", " ")}
                        </p>
                      ))}
                    </>
                  )}
                  {role === "owner" && (
                    <form
                      onSubmit={(e) => {
                        const d = form(e);
                        if (d.confirm === workspace.name)
                          void command("archive_workspace", {});
                        else setError("Enter the workspace name to archive.");
                      }}
                      className="max-w-md space-y-3"
                    >
                      <p className="text-sm">
                        Archiving disables workspace access and retains its
                        history.
                      </p>
                      <Field label="Type workspace name to archive">
                        <input name="confirm" className={inputStyle} required />
                      </Field>
                      <button disabled={busy} className={buttonStyle}>
                        Archive workspace
                      </button>
                    </form>
                  )}
                </section>
              )}
            </>
          ) : (
            <p>
              Workspace unavailable.{" "}
              <Link href="/teams">Return to your workspaces.</Link>
            </p>
          )}
        </>
      )}
    </main>
  );
}

-- RiteStack subscriptions. New project only — never Job Pursuit.
-- Isolation: every policy keys off auth.uid(). Anon cannot read rows.

create table if not exists public.subscriptions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  monthly_cost numeric(12, 2) not null check (monthly_cost >= 0),
  renew_date date not null,
  category text not null,
  cancel_url text not null default '',
  last_used date,
  decision text not null default 'undecided'
    check (decision in ('undecided', 'keep', 'cut', 'pause')),
  remind_at date,
  is_sample boolean not null default false,
  cut_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_user_decision_idx on public.subscriptions (user_id, decision);

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_delete_own" on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "subscriptions_insert_own"
  on public.subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "subscriptions_update_own"
  on public.subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "subscriptions_delete_own"
  on public.subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- No table grants for anon. Authenticated can CRUD only their rows (RLS still applies).
revoke all on table public.subscriptions from anon, public;
grant select, insert, update, delete on table public.subscriptions to authenticated;

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute procedure public.set_subscriptions_updated_at();

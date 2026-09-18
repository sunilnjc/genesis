-- RiteStack billing: 7-day trial after signup, then $14 pack.
-- Assumes Supabase Auth (`auth.users` / `auth.uid()`). Safe if a later auth
-- branch also creates `public.profiles` — columns are added if missing.
-- Complementary to subscriptions RLS (auth branch); this file only adds profiles.
-- Apply in the *new* RiteStack Supabase project only. Not Job Pursuit.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  trial_ends_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  pack_paid_at timestamptz,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists trial_ends_at timestamptz,
  add column if not exists pack_paid_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.profiles
set trial_ends_at = timezone('utc', now()) + interval '7 days'
where trial_ends_at is null;

alter table public.profiles
  alter column trial_ends_at set default (timezone('utc', now()) + interval '7 days'),
  alter column trial_ends_at set not null;

create or replace function public.ritestack_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists ritestack_profiles_updated_at on public.profiles;
create trigger ritestack_profiles_updated_at
before update on public.profiles
for each row execute procedure public.ritestack_set_updated_at();

create or replace function public.ritestack_on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, trial_ends_at)
  values (new.id, timezone('utc', now()) + interval '7 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ritestack_on_auth_user_created on auth.users;
create trigger ritestack_on_auth_user_created
after insert on auth.users
for each row execute procedure public.ritestack_on_auth_user_created();

-- Idempotent: starts the 7-day clock once. Callers cannot pass trial_ends_at.
create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  insert into public.profiles (id, trial_ends_at)
  values (uid, timezone('utc', now()) + interval '7 days')
  on conflict (id) do nothing;

  select * into row from public.profiles where id = uid;
  return row;
end;
$$;

revoke all on function public.ensure_own_profile() from public, anon;
grant execute on function public.ensure_own_profile() to authenticated;

alter table public.profiles enable row level security;

revoke all on public.profiles from public, anon;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists ritestack_profiles_select_own on public.profiles;
create policy ritestack_profiles_select_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

-- No insert/update/delete for authenticated: trial clock and pack_paid_at are
-- trigger / service_role (Stripe webhook) only.

commit;

-- Additive rollout: old cuts have no confirmation and remain pending.
begin;
alter table public.subscriptions
  add column if not exists cancellation_confirmed_at date,
  add column if not exists cancellation_note text not null default '',
  add column if not exists billing_url text not null default '';

-- Older native clients can still change decisions without retaining a stale confirmation.
create or replace function public.set_subscriptions_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  if new.decision <> 'cut' or old.decision <> 'cut' then
    new.cancellation_confirmed_at = null;
    new.cancellation_note = '';
  end if;
  return new;
end;
$$;
-- Existing owner-only RLS and grants remain unchanged.
notify pgrst, 'reload schema';
commit;

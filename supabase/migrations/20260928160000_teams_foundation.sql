-- Additive pilot schema. Never changes personal subscriptions or profiles.
begin;
create schema if not exists teams_private;
revoke all on schema teams_private from public, anon, authenticated;
create table public.team_pilot_accounts (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80),
 timezone text not null, owner_id uuid not null references auth.users(id), archived_at timestamptz, created_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','admin','member')), display_name text not null,
 primary key(workspace_id,user_id)
);
create unique index workspace_one_owner on public.workspace_members(workspace_id) where role='owner';
create table public.workspace_entitlements (
 workspace_id uuid primary key references public.workspaces(id), state text not null default 'pilot' check(state in ('pilot','paid','expired')),
 expires_at timestamptz not null default now()+interval '30 days', member_limit int not null default 30 check(member_limit between 1 and 1000)
);
create table public.workspace_invitations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 email text not null check(email=lower(trim(email)) and email like '%@%'), role text not null check(role in ('admin','member')),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz, revoked_at timestamptz, created_by uuid not null, created_at timestamptz not null default now()
);
create table public.team_subscriptions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null check(length(trim(name)) between 1 and 120), owner_id uuid,
 amount_minor bigint not null check(amount_minor between 0 and 9000000000000), currency text not null check(currency in ('USD','AED','EUR','GBP','INR','JPY','KWD')),
 interval_months int not null check(interval_months in (1,3,6,12)), seats int not null check(seats between 1 and 100000),
 renewal_date date not null, cancellation_deadline date, last_confirmed_at timestamptz,
 version int not null default 1, archived_at timestamptz, created_at timestamptz not null default now(),
 unique(workspace_id,id), foreign key(workspace_id,owner_id) references public.workspace_members(workspace_id,user_id)
);
create table public.renewal_reviews (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, subscription_id uuid not null,
 renewal_date date not null, decision_deadline date not null, currency text not null, before_minor bigint not null, interval_months int not null,
 state text not null default 'awaiting_owner' check(state in ('awaiting_owner','awaiting_approval','awaiting_execution','completed','superseded','cancelled')),
 decision text check(decision in ('keep','reduce','pause','cancel')), proposed_minor bigint check(proposed_minor>=0), proposed_seats int check(proposed_seats>=0), reason text,
 recommended_by uuid, approved_by uuid, executor_id uuid, version int not null default 1, created_at timestamptz not null default now(),
 unique(workspace_id,id),
 foreign key(workspace_id,subscription_id) references public.team_subscriptions(workspace_id,id)
);
create unique index team_review_occurrence on public.renewal_reviews(subscription_id,renewal_date) where state not in ('superseded','cancelled');
create table public.review_actions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, review_id uuid not null unique, actor_id uuid not null,
 outcome text not null check(length(trim(outcome)) between 1 and 2000), effective_date date not null,
 before_minor bigint not null, after_minor bigint not null check(after_minor>=0), currency text not null, interval_months int not null,
 created_at timestamptz not null default now(), foreign key(workspace_id,review_id) references public.renewal_reviews(workspace_id,id)
);
create table public.review_comments (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, review_id uuid not null, author_id uuid not null,
 body text not null check(length(trim(body)) between 1 and 2000), created_at timestamptz not null default now(),
 foreign key(workspace_id,review_id) references public.renewal_reviews(workspace_id,id)
);
create table public.activity_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), actor_id uuid not null,
 event text not null, entity_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table teams_private.commands (
 actor_id uuid not null, request_id uuid not null, fingerprint text not null, result jsonb not null, primary key(actor_id,request_id)
);
create or replace function public.team_role(w uuid) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.workspace_members m join public.workspaces wks on wks.id=m.workspace_id
 where m.workspace_id=w and m.user_id=auth.uid() and wks.archived_at is null
$$;
create or replace function public.team_can_read_tool(w uuid,t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_subscriptions s where s.workspace_id=w and s.id=t
 and (public.team_role(w) in ('owner','admin') or (public.team_role(w)='member' and s.owner_id=auth.uid())))
$$;
create or replace function public.team_can_read_review(w uuid,r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.renewal_reviews v where v.workspace_id=w and v.id=r and public.team_can_read_tool(w,v.subscription_id))
$$;
revoke all on function public.team_role(uuid), public.team_can_read_tool(uuid,uuid), public.team_can_read_review(uuid,uuid) from public,anon;
grant execute on function public.team_role(uuid), public.team_can_read_tool(uuid,uuid), public.team_can_read_review(uuid,uuid) to authenticated;
-- All writes go through transactional commands, not direct row edits.
do $$ declare t text; begin
 foreach t in array array['team_pilot_accounts','workspaces','workspace_members','workspace_entitlements','workspace_invitations','team_subscriptions','renewal_reviews','review_actions','review_comments','activity_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy pilot_self on public.team_pilot_accounts for select to authenticated using(user_id=auth.uid());
create policy workspace_read on public.workspaces for select to authenticated using(public.team_role(id) is not null);
create policy member_read on public.workspace_members for select to authenticated using(public.team_role(workspace_id) in ('owner','admin') or (user_id=auth.uid() and public.team_role(workspace_id) is not null));
create policy entitlement_read on public.workspace_entitlements for select to authenticated using(public.team_role(workspace_id) is not null);
create policy invitation_read on public.workspace_invitations for select to authenticated using(public.team_role(workspace_id) in ('owner','admin'));
create policy tool_read on public.team_subscriptions for select to authenticated using(public.team_can_read_tool(workspace_id,id));
create policy review_read on public.renewal_reviews for select to authenticated using(public.team_can_read_tool(workspace_id,subscription_id));
create policy action_read on public.review_actions for select to authenticated using(public.team_can_read_review(workspace_id,review_id));
create policy comment_read on public.review_comments for select to authenticated using(public.team_can_read_review(workspace_id,review_id));
create policy activity_read on public.activity_events for select to authenticated using(public.team_role(workspace_id) in ('owner','admin'));

create or replace function public.team_command(p_workspace uuid,p_action text,p_data jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); actor_email text; role_name text; w uuid:=p_workspace; entity uuid; result jsonb;
 fingerprint text:=md5(coalesce(p_workspace::text,'')||p_action||p_data::text); previous teams_private.commands%rowtype;
 inv public.workspace_invitations%rowtype; tool public.team_subscriptions%rowtype; review public.renewal_reviews%rowtype;
 entitlement public.workspace_entitlements%rowtype; target uuid; item jsonb; row_number int:=0;
begin
 if actor is null or p_key is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select lower(email) into actor_email from auth.users where id=actor and email_confirmed_at is not null;
 if actor_email is null then raise exception 'Verified email required' using errcode='42501'; end if;
 -- Serialize retries from this actor; workspace lock also serializes membership and writes.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into previous from teams_private.commands where actor_id=actor and request_id=p_key;
 if found then
  if previous.fingerprint<>fingerprint then raise exception 'Idempotency key reused with different input' using errcode='22023'; end if;
  if public.team_role((previous.result->>'workspace_id')::uuid) is null then raise exception 'Access revoked' using errcode='42501'; end if;
  return previous.result;
 end if;
 if p_action='create_workspace' then
  if not exists(select 1 from public.team_pilot_accounts where user_id=actor) then raise exception 'Pilot access required' using errcode='42501'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'Invalid timezone' using errcode='22023'; end if;
  insert into public.workspaces(name,timezone,owner_id) values(trim(p_data->>'name'),p_data->>'timezone',actor) returning id into w;
  insert into public.workspace_members values(w,actor,'owner',actor_email);
  insert into public.workspace_entitlements(workspace_id) values(w);
  entity:=w;
 elsif p_action='accept_invite' then
  select * into inv from public.workspace_invitations where token_hash=p_data->>'token_hash';
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  w:=inv.workspace_id;
 end if;
 if w is null then raise exception 'Workspace required' using errcode='22023'; end if;
 perform 1 from public.workspaces where id=w and archived_at is null for update;
 if not found then raise exception 'Workspace unavailable' using errcode='42501'; end if;
 select * into entitlement from public.workspace_entitlements where workspace_id=w;
 if entitlement.state not in ('pilot','paid') or entitlement.expires_at<=now() then raise exception 'Workspace access expired' using errcode='42501'; end if;
 role_name:=public.team_role(w);
 if p_action='accept_invite' then
  select * into inv from public.workspace_invitations where id=inv.id for update;
  if inv.email<>actor_email or inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at<=now() then raise exception 'Invitation unavailable or email does not match' using errcode='42501'; end if;
  if exists(select 1 from public.workspace_members where workspace_id=w and user_id=actor) then raise exception 'Already a member' using errcode='22023'; end if;
  if (select count(*) from public.workspace_members where workspace_id=w)>=entitlement.member_limit then raise exception 'Member limit reached' using errcode='22023'; end if;
  insert into public.workspace_members values(w,actor,inv.role,actor_email);
  update public.workspace_invitations set accepted_at=now() where id=inv.id;
  entity:=inv.id;
 elsif role_name is null then raise exception 'Workspace access denied' using errcode='42501';
 elsif p_action='create_workspace' then null;
 elsif p_action in ('invite','revoke_invite','remove_member','set_role','import_tools','create_tool','update_tool','archive_tool','approve','return_review','complete','archive_workspace') and role_name not in ('owner','admin') then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if p_action='import_tools' then
  if jsonb_typeof(p_data->'rows') is distinct from 'array' or jsonb_array_length(p_data->'rows') not between 1 and 100 then raise exception 'Import 1 to 100 rows' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_data->'rows') loop
   if exists(select 1 from public.team_subscriptions where workspace_id=w and archived_at is null and lower(trim(name))=lower(trim(item->>'name')) and currency=item->>'currency' and renewal_date=(item->>'renewal_date')::date) then raise exception 'Duplicate tool in import or inventory' using errcode='23505'; end if;
   row_number:=row_number+1;
   perform public.team_command(w,'create_tool',item,md5(p_key::text||':'||row_number::text)::uuid);
  end loop;
  entity:=w;
 elsif p_action='invite' then
  if p_data->>'role'='admin' and role_name<>'owner' then raise exception 'Only owner can appoint admins' using errcode='42501'; end if;
  insert into public.workspace_invitations(workspace_id,email,role,token_hash,created_by)
  values(w,lower(trim(p_data->>'email')),p_data->>'role',p_data->>'token_hash',actor) returning id into entity;
 elsif p_action='revoke_invite' then
  update public.workspace_invitations set revoked_at=now() where id=(p_data->>'id')::uuid and workspace_id=w and accepted_at is null returning id into entity;
  if entity is null then raise exception 'Invitation unavailable' using errcode='22023'; end if;
 elsif p_action in ('remove_member','set_role') then
  target:=(p_data->>'user_id')::uuid;
  if not exists(select 1 from public.workspace_members where workspace_id=w and user_id=target and role<>'owner' and (role_name='owner' or role='member')) then raise exception 'Cannot change this member' using errcode='42501'; end if;
  if p_action='set_role' then
   if role_name<>'owner' or p_data->>'role' not in ('admin','member') then raise exception 'Only owner can change roles' using errcode='42501'; end if;
   update public.workspace_members set role=p_data->>'role' where workspace_id=w and user_id=target;
  else
   update public.team_subscriptions set owner_id=null,version=version+1 where workspace_id=w and owner_id=target;
   update public.renewal_reviews set executor_id=null,version=version+1 where workspace_id=w and executor_id=target and state='awaiting_execution';
   update public.workspace_invitations set revoked_at=now() where workspace_id=w and accepted_at is null and email=(select lower(email) from auth.users where id=target);
   delete from public.workspace_members where workspace_id=w and user_id=target;
  end if;
  entity:=target;
 elsif p_action in ('create_tool','update_tool','archive_tool') then
  if p_action<>'create_tool' then
   select * into tool from public.team_subscriptions where workspace_id=w and id=(p_data->>'id')::uuid for update;
   if not found then raise exception 'Tool unavailable' using errcode='42501'; end if;
   if tool.version is distinct from (p_data->>'version')::int then raise exception 'This tool changed. Refresh before saving.' using errcode='40001'; end if;
   if tool.archived_at is not null then raise exception 'Tool is archived' using errcode='22023'; end if;
  end if;
  if p_action='archive_tool' then
   update public.team_subscriptions set archived_at=now(),version=version+1 where id=tool.id returning id into entity;
   update public.renewal_reviews set state='cancelled',version=version+1 where subscription_id=entity and state not in ('completed','cancelled','superseded');
  else
   if p_action='create_tool' then
    insert into public.team_subscriptions(workspace_id,name,owner_id,amount_minor,currency,interval_months,seats,renewal_date,cancellation_deadline)
    values(w,trim(p_data->>'name'),nullif(p_data->>'owner_id','')::uuid,(p_data->>'amount_minor')::bigint,p_data->>'currency',(p_data->>'interval_months')::int,(p_data->>'seats')::int,(p_data->>'renewal_date')::date,nullif(p_data->>'cancellation_deadline','')::date) returning id into entity;
   else
    -- Every edit explicitly supersedes an open snapshot; completed reviews never change.
    update public.team_subscriptions set name=trim(p_data->>'name'),owner_id=nullif(p_data->>'owner_id','')::uuid,amount_minor=(p_data->>'amount_minor')::bigint,currency=p_data->>'currency',interval_months=(p_data->>'interval_months')::int,seats=(p_data->>'seats')::int,renewal_date=(p_data->>'renewal_date')::date,cancellation_deadline=nullif(p_data->>'cancellation_deadline','')::date,version=version+1 where id=tool.id returning id into entity;
    update public.renewal_reviews set state='superseded',version=version+1 where subscription_id=entity and state not in ('completed','cancelled','superseded');
   end if;
  end if;
 elsif p_action='open_review' then
  select * into tool from public.team_subscriptions where workspace_id=w and id=(p_data->>'id')::uuid and archived_at is null;
  if not found or not public.team_can_read_tool(w,tool.id) then raise exception 'Tool unavailable' using errcode='42501'; end if;
  insert into public.renewal_reviews(workspace_id,subscription_id,renewal_date,decision_deadline,currency,before_minor,interval_months)
  values(w,tool.id,tool.renewal_date,coalesce(tool.cancellation_deadline,tool.renewal_date),tool.currency,tool.amount_minor,tool.interval_months) returning id into entity;
 elsif p_action in ('recommend','approve','return_review','complete','comment') then
  select * into review from public.renewal_reviews where workspace_id=w and id=(p_data->>'id')::uuid for update;
  if not found or not public.team_can_read_review(w,review.id) then raise exception 'Review unavailable' using errcode='42501'; end if;
  select * into tool from public.team_subscriptions where id=review.subscription_id;
  if p_action<>'comment' and review.version is distinct from (p_data->>'version')::int then raise exception 'This review changed. Refresh before saving.' using errcode='40001'; end if;
  entity:=review.id;
  if p_action='recommend' then
   if review.state<>'awaiting_owner' or tool.owner_id is distinct from actor then raise exception 'Only assigned owner can recommend on an open review' using errcode='42501'; end if;
   if p_data->>'decision' not in ('keep','reduce','pause','cancel') or length(trim(coalesce(p_data->>'reason',''))) not between 1 and 2000 then raise exception 'Decision and reason required' using errcode='22023'; end if;
   if (p_data->>'proposed_minor')::bigint not between 0 and review.before_minor or (p_data->>'proposed_seats')::int not between 0 and tool.seats then raise exception 'Invalid proposed cost or seats' using errcode='22023'; end if;
   if (p_data->>'decision'='keep' and ((p_data->>'proposed_minor')::bigint<>review.before_minor or (p_data->>'proposed_seats')::int<>tool.seats)) or (p_data->>'decision' in ('pause','cancel') and (p_data->>'proposed_minor')::bigint<>0) or (p_data->>'decision'='reduce' and (p_data->>'proposed_minor')::bigint>=review.before_minor) then raise exception 'Proposed amount does not match decision' using errcode='22023'; end if;
   if p_data->>'proposed_minor' is null or p_data->>'proposed_seats' is null then raise exception 'Proposed cost and seats required' using errcode='22023'; end if;
   update public.renewal_reviews set state='awaiting_approval',decision=p_data->>'decision',reason=trim(p_data->>'reason'),proposed_minor=(p_data->>'proposed_minor')::bigint,proposed_seats=(p_data->>'proposed_seats')::int,recommended_by=actor,version=version+1 where id=review.id;
   update public.team_subscriptions set last_confirmed_at=now(),version=version+1 where id=tool.id;
  elsif p_action='return_review' then
   if review.state<>'awaiting_approval' then raise exception 'Review is not awaiting approval' using errcode='22023'; end if;
   insert into public.review_comments(workspace_id,review_id,author_id,body) values(w,review.id,actor,p_data->>'reason');
   update public.renewal_reviews set state='awaiting_owner',version=version+1 where id=review.id;
  elsif p_action='approve' then
   if review.state<>'awaiting_approval' then raise exception 'Review is not awaiting approval' using errcode='22023'; end if;
   target:=(p_data->>'executor_id')::uuid;
   if review.decision<>'keep' and not exists(select 1 from public.workspace_members where workspace_id=w and user_id=target and role in ('owner','admin')) then raise exception 'Assign an administrator to execute' using errcode='22023'; end if;
   update public.renewal_reviews set state=case when decision='keep' then 'completed' else 'awaiting_execution' end,approved_by=actor,executor_id=target,version=version+1 where id=review.id;
  elsif p_action='complete' then
   if review.state<>'awaiting_execution' or review.executor_id is distinct from actor then raise exception 'Only assigned executor can complete approved action' using errcode='42501'; end if;
   insert into public.review_actions(workspace_id,review_id,actor_id,outcome,effective_date,before_minor,after_minor,currency,interval_months)
   values(w,review.id,actor,p_data->>'outcome',(p_data->>'effective_date')::date,review.before_minor,(p_data->>'after_minor')::bigint,review.currency,review.interval_months);
   update public.renewal_reviews set state='completed',version=version+1 where id=review.id;
  else
   insert into public.review_comments(workspace_id,review_id,author_id,body) values(w,review.id,actor,p_data->>'body');
  end if;
 elsif p_action='archive_workspace' then
  if role_name<>'owner' then raise exception 'Only owner can archive' using errcode='42501'; end if;
  update public.workspaces set archived_at=now() where id=w;
 elsif p_action not in ('create_workspace','accept_invite') then raise exception 'Unknown command' using errcode='22023';
 end if;
 insert into public.activity_events(workspace_id,actor_id,event,entity_id,details) values(w,actor,p_action,entity,p_data-'token_hash');
 result:=jsonb_build_object('workspace_id',w,'id',entity);
 insert into teams_private.commands values(actor,p_key,fingerprint,result);
 return result;
end $$;
revoke all on function public.team_command(uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.team_command(uuid,text,jsonb,uuid) to authenticated;
create index team_tools_owner on public.team_subscriptions(workspace_id,owner_id);
create index team_reviews_queue on public.renewal_reviews(workspace_id,state,decision_deadline);
commit;

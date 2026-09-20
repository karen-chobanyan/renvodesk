-- A teammate can read sites/files/tasks and edit only tasks assigned to them.
alter table public.organization_memberships drop constraint organization_memberships_role_check;
alter table public.organization_memberships add constraint organization_memberships_role_check check(role in ('owner','member'));
alter table public.project_tasks add column assignee_id uuid;
alter table public.project_tasks add constraint tasks_assignee_member foreign key(organization_id,assignee_id) references public.organization_memberships(organization_id,user_id);
create index tasks_assignee_idx on public.project_tasks(organization_id,assignee_id);
grant insert(assignee_id), update(assignee_id) on public.project_tasks to authenticated;
create policy tasks_update_assigned on public.project_tasks for update to authenticated
using(assignee_id=(select auth.uid()) and organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())))
with check(assignee_id=(select auth.uid()) and organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));

-- Existing member-read policies predate a non-owner role. Sensitive directories
-- and financial records are owner-only; restrictive policies also cover RPC reads.
DO $$ declare t text; begin
 foreach t in array array['clients','properties','estimates','project_costs','project_budgets'] loop
 execute format('create policy owner_read on public.%I as restrictive for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role=''owner''))',t);
 end loop;
end $$;

create table public.team_invitations(
 id uuid primary key,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null check(email=lower(btrim(email)) and length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 role text not null default 'member' check(role='member'),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 revoked_at timestamptz,
 accepted_by uuid references auth.users(id),
 accepted_at timestamptz
);
create index team_invitations_org_idx on public.team_invitations(organization_id,created_at,id);
alter table public.team_invitations enable row level security;
revoke all on public.team_invitations from anon,authenticated;
grant select on public.team_invitations to authenticated;
create policy invitations_read_owner on public.team_invitations for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));

create function private.team_invite(p_org uuid,p_email text,p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.team_invitations; v_email text:=lower(btrim(p_email));
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships where organization_id=p_org and user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501'; end if;
 -- Serialize creation/removal in one organization for limits and pending revocation.
 perform 1 from public.organizations where id=p_org for update;
 select * into existing from public.team_invitations where id=p_id;
 if found then
  if existing.organization_id=p_org and existing.created_by=auth.uid() and existing.email=v_email then return existing.id; end if;
  raise exception 'Request already used' using errcode='22023';
 end if;
 if (select count(*) from public.team_invitations where organization_id=p_org and revoked_at is null and accepted_at is null and expires_at>now())>=100 then raise exception 'Too many pending invitations'; end if;
 insert into public.team_invitations(id,organization_id,email,created_by) values(p_id,p_org,v_email,auth.uid());
 return p_id;
end $$;

create function private.team_invitation(p_id uuid,p_accept boolean default false) returns table(organization_id uuid,company_name text,member_role text) language plpgsql security definer set search_path='' as $$
declare inv public.team_invitations; v_email text;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null and coalesce(is_anonymous,false)=false;
 if v_email is null then raise exception 'Verified recipient required' using errcode='42501'; end if;
 select * into inv from public.team_invitations where id=p_id for update;
 if not found or inv.email<>v_email or inv.revoked_at is not null then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 if inv.accepted_at is not null then
  if inv.accepted_by<>auth.uid() or not exists(select 1 from public.organization_memberships m where m.organization_id=inv.organization_id and m.user_id=auth.uid()) then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 else
  if inv.expires_at<=now() or not exists(select 1 from public.organization_memberships m where m.organization_id=inv.organization_id and m.user_id=inv.created_by and m.role='owner') then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  if p_accept then
   insert into public.organization_memberships(organization_id,user_id,role) values(inv.organization_id,auth.uid(),'member') on conflict do nothing;
   update public.team_invitations set accepted_by=auth.uid(),accepted_at=now() where id=p_id;
  end if;
 end if;
 return query select o.id,o.name,inv.role from public.organizations o where o.id=inv.organization_id;
end $$;

create function private.team_members(p_org uuid,p_offset integer default 0) returns table(user_id uuid,email text,role text) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships m where m.organization_id=p_org and m.user_id=auth.uid()) then raise exception 'Membership required' using errcode='42501'; end if;
 return query select m.user_id,u.email::text,m.role from public.organization_memberships m join auth.users u on u.id=m.user_id where m.organization_id=p_org order by u.email,m.user_id limit 50 offset greatest(p_offset,0);
end $$;

create function private.team_revoke(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships where organization_id=p_org and user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501'; end if;
 update public.team_invitations set revoked_at=coalesce(revoked_at,now()) where organization_id=p_org and id=p_id and accepted_at is null;
end $$;

create function private.team_remove(p_org uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_email text;
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships where organization_id=p_org and user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 perform 1 from public.organization_memberships where organization_id=p_org and user_id=p_user and role='member' for update;
 if not found then return; end if;
 select lower(email) into v_email from auth.users where id=p_user;
 update public.team_invitations set revoked_at=coalesce(revoked_at,now()) where organization_id=p_org and (accepted_by=p_user or (email=v_email and accepted_at is null));
 update public.project_tasks set assignee_id=null,revision=revision+1 where organization_id=p_org and assignee_id=p_user;
 delete from public.organization_memberships where organization_id=p_org and user_id=p_user and role='member';
end $$;

create function public.team_invite(p_org uuid,p_email text,p_id uuid) returns uuid language sql security invoker set search_path='' as $$select private.team_invite(p_org,p_email,p_id)$$;
create function public.team_invitation(p_id uuid,p_accept boolean default false) returns table(organization_id uuid,company_name text,member_role text) language sql security invoker set search_path='' as $$select * from private.team_invitation(p_id,p_accept)$$;
create function public.team_members(p_org uuid,p_offset integer default 0) returns table(user_id uuid,email text,role text) language sql security invoker set search_path='' as $$select * from private.team_members(p_org,p_offset)$$;
create function public.team_revoke(p_org uuid,p_id uuid) returns void language sql security invoker set search_path='' as $$select private.team_revoke(p_org,p_id)$$;
create function public.team_remove(p_org uuid,p_user uuid) returns void language sql security invoker set search_path='' as $$select private.team_remove(p_org,p_user)$$;
DO $$ declare sig text; s text; begin
 foreach s in array array['public','private'] loop
 foreach sig in array array['team_invite(uuid,text,uuid)','team_invitation(uuid,boolean)','team_members(uuid,integer)','team_revoke(uuid,uuid)','team_remove(uuid,uuid)'] loop
 execute 'revoke all on function '||s||'.'||sig||' from public,anon,authenticated';
 execute 'grant execute on function '||s||'.'||sig||' to authenticated';
 end loop; end loop;
end $$;

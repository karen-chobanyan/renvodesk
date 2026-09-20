
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 120),
 country text not null check (country in ('BE','FR','NL')),
 created_by uuid not null references auth.users(id),
 request_id uuid not null,
 created_at timestamptz not null default now(),
 unique(created_by, request_id)
);
create table public.organization_memberships (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'owner' check (role = 'owner'),
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create index organization_memberships_user_idx on public.organization_memberships(user_id,organization_id);
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
revoke all on public.organizations, public.organization_memberships from anon, authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;
create policy memberships_read_self on public.organization_memberships for select to authenticated
 using (user_id = (select auth.uid()));
create policy organizations_read_member on public.organizations for select to authenticated
 using (id in (select organization_id from public.organization_memberships where user_id = (select auth.uid())));

-- Privilege elevation is limited to atomic onboarding. Never accept user or role
-- parameters. This private schema is not exposed through the Data API.
create function private.create_organization(p_name text, p_country text, p_request_id uuid)
 returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_org uuid;
begin
 if v_user is null or not exists (
   select 1 from auth.users where id=v_user and email_confirmed_at is not null
   and email is not null and coalesce(is_anonymous,false)=false
 ) then raise exception 'A verified account is required' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 120
 or p_country is null or p_country not in ('BE','FR','NL') or p_request_id is null then
 raise exception 'Invalid company details' using errcode='22023'; end if;
 insert into public.organizations(name,country,created_by,request_id)
 values (btrim(p_name),p_country,v_user,p_request_id)
 on conflict(created_by,request_id) do nothing returning id into v_org;
 if v_org is null then
 select id into v_org from public.organizations where created_by=v_user and request_id=p_request_id;
 end if;
 insert into public.organization_memberships(organization_id,user_id,role)
 values(v_org,v_user,'owner') on conflict do nothing;
 return v_org;
end $$;
revoke all on function private.create_organization(text,text,uuid) from public,anon;
grant execute on function private.create_organization(text,text,uuid) to authenticated;

create function public.create_organization(p_name text,p_country text,p_request_id uuid)
 returns uuid language sql security invoker set search_path = ''
 as $$ select private.create_organization(p_name,p_country,p_request_id); $$;
revoke all on function public.create_organization(text,text,uuid) from public,anon;
grant execute on function public.create_organization(text,text,uuid) to authenticated;

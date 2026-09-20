create table public.projects (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 1 and 120),
 client_name text not null check (char_length(trim(client_name)) between 1 and 120),
 city text not null check (char_length(trim(city)) between 1 and 120),
 address text not null default '' check (char_length(address) <= 300),
 status text not null default 'planning' check (status in ('planning','active','completed')),
 created_at timestamptz not null default now(),
 primary key (organization_id,id)
);
create index projects_organization_created_idx on public.projects(organization_id,created_at desc,id);
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select on public.projects to authenticated;
grant insert (organization_id,id,name,client_name,city,address) on public.projects to authenticated;
create policy projects_member_read on public.projects for select to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()))
);
create policy projects_owner_create on public.projects for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
);

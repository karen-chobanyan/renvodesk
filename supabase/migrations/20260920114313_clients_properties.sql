create table public.clients (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 name text not null check(char_length(trim(name)) between 1 and 120),
 kind text not null default 'individual' check(kind in('individual','company')),
 email text not null default '' check(char_length(email)<=254 and (email='' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 phone text not null default '' check(char_length(phone)<=60),
 billing_address text not null default '' check(char_length(billing_address)<=500),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 primary key(organization_id,id)
);
create table public.properties (
 organization_id uuid not null,
 client_id uuid not null,
 id uuid not null default gen_random_uuid(),
 label text not null check(char_length(trim(label)) between 1 and 120),
 address text not null check(char_length(trim(address)) between 1 and 300),
 city text not null check(char_length(trim(city)) between 1 and 120),
 country text not null default 'BE' check(country in('BE','FR','NL')),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,client_id,id),
 foreign key(organization_id,client_id) references public.clients(organization_id,id)
);
create index clients_name_idx on public.clients(organization_id,name,id);
create index properties_client_idx on public.properties(organization_id,client_id,label,id);
alter table public.clients enable row level security;
alter table public.properties enable row level security;
revoke all on public.clients,public.properties from anon,authenticated;
grant select on public.clients,public.properties to authenticated;
grant insert(organization_id,id,name,kind,email,phone,billing_address) on public.clients to authenticated;
grant update(name,kind,email,phone,billing_address,revision) on public.clients to authenticated;
grant insert(organization_id,client_id,id,label,address,city,country) on public.properties to authenticated;
grant update(label,address,city,country,revision) on public.properties to authenticated;
create policy clients_read on public.clients for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));
create policy clients_create on public.clients for insert to authenticated with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy clients_update on public.clients for update to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')) with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy properties_read on public.properties for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));
create policy properties_create on public.properties for insert to authenticated with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy properties_update on public.properties for update to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')) with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create function private.check_directory_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.revision<>old.revision+1 then raise exception 'Revision must advance by one' using errcode='40001'; end if;
 return new;
end; $$;
revoke all on function private.check_directory_revision() from public,anon,authenticated;
create trigger clients_revision before update on public.clients for each row execute function private.check_directory_revision();
create trigger properties_revision before update on public.properties for each row execute function private.check_directory_revision();
alter table public.projects add column client_id uuid, add column property_id uuid,
 add constraint projects_client_fk foreign key(organization_id,client_id) references public.clients(organization_id,id),
 add constraint projects_property_fk foreign key(organization_id,client_id,property_id) references public.properties(organization_id,client_id,id),
 add constraint project_property_requires_client check(property_id is null or client_id is not null);
create index projects_client_idx on public.projects(organization_id,client_id,property_id);
grant insert(client_id,property_id) on public.projects to authenticated;

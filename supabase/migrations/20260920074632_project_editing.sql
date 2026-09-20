alter table public.projects add column revision integer not null default 1 check (revision > 0);
create function private.check_project_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.revision <> old.revision + 1 then
  raise exception 'Project revision must advance by one' using errcode = '40001';
 end if;
 return new;
end;
$$;
revoke all on function private.check_project_revision() from public, anon, authenticated;
create trigger projects_revision before update on public.projects
for each row execute function private.check_project_revision();
grant update(name,client_name,city,address,status,revision) on public.projects to authenticated;
create policy projects_owner_update on public.projects for update to authenticated
using (organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'))
with check (organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));

create table public.project_tasks (
 organization_id uuid not null,
 project_id uuid not null,
 id uuid not null default gen_random_uuid(),
 title text not null check (char_length(trim(title)) between 1 and 160),
 notes text not null default '' check (char_length(notes) <= 2000),
 status text not null default 'todo' check (status in ('todo','in_progress','done')),
 start_date date check (start_date between date '1900-01-01' and date '2100-12-31'),
 due_date date check (due_date between date '1900-01-01' and date '2100-12-31'),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 primary key (organization_id,id),
 foreign key (organization_id,project_id) references public.projects(organization_id,id) on delete cascade,
 check (start_date is null or due_date is null or start_date <= due_date)
);
create index project_tasks_project_idx on public.project_tasks(organization_id,project_id,created_at,id);
create index project_tasks_due_idx on public.project_tasks(organization_id,due_date,id);
create index project_tasks_start_idx on public.project_tasks(organization_id,start_date,id);
alter table public.project_tasks enable row level security;
revoke all on public.project_tasks from anon, authenticated;
grant select on public.project_tasks to authenticated;
grant insert(organization_id,project_id,id,title,notes,status,start_date,due_date) on public.project_tasks to authenticated;
grant update(title,notes,status,start_date,due_date,revision) on public.project_tasks to authenticated;
grant delete on public.project_tasks to authenticated;
create policy tasks_member_read on public.project_tasks for select to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()))
);
create policy tasks_owner_create on public.project_tasks for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
);
create policy tasks_owner_update on public.project_tasks for update to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
) with check (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
);
create policy tasks_owner_delete on public.project_tasks for delete to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
);
create function private.check_task_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.revision <> old.revision + 1 then raise exception 'Task revision must advance by one' using errcode='40001'; end if;
 return new;
end;
$$;
revoke all on function private.check_task_revision() from public,anon,authenticated;
create trigger project_tasks_revision before update on public.project_tasks for each row execute function private.check_task_revision();

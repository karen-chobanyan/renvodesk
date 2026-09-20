create table public.project_budgets (
 organization_id uuid not null,
 project_id uuid not null,
 budget_cents bigint not null check (budget_cents between 0 and 999999999),
 revision integer not null default 1 check (revision>0),
 primary key(organization_id,project_id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade
);
create table public.project_costs (
 organization_id uuid not null,
 project_id uuid not null,
 id uuid not null default gen_random_uuid(),
 description text not null check(char_length(trim(description)) between 1 and 200),
 category text not null check(category in ('materials','labor','subcontractors','other')),
 amount_cents bigint not null check(amount_cents between 1 and 999999999),
 incurred_on date not null check(incurred_on between date '1900-01-01' and date '2100-12-31'),
 notes text not null default '' check(char_length(notes)<=2000),
 voided boolean not null default false,
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade
);
create index project_costs_project_idx on public.project_costs(organization_id,project_id,incurred_on desc,id);
alter table public.project_budgets enable row level security;
alter table public.project_costs enable row level security;
revoke all on public.project_budgets, public.project_costs from anon,authenticated;
grant select on public.project_budgets,public.project_costs to authenticated;
grant insert(organization_id,project_id,budget_cents) on public.project_budgets to authenticated;
grant update(budget_cents,revision) on public.project_budgets to authenticated;
grant insert(organization_id,project_id,id,description,category,amount_cents,incurred_on,notes) on public.project_costs to authenticated;
grant update(description,category,amount_cents,incurred_on,notes,voided,revision) on public.project_costs to authenticated;
create policy budgets_read on public.project_budgets for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));
create policy budgets_create on public.project_budgets for insert to authenticated with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy budgets_update on public.project_budgets for update to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')) with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy costs_read on public.project_costs for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));
create policy costs_create on public.project_costs for insert to authenticated with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy costs_update on public.project_costs for update to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')) with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create function private.check_cost_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.revision<>old.revision+1 then raise exception 'Revision must advance by one' using errcode='40001'; end if;
 if tg_table_name='project_costs' then
  if old.voided then raise exception 'Voided costs are immutable' using errcode='22023'; end if;
 end if;
 return new;
end; $$;
revoke all on function private.check_cost_revision() from public,anon,authenticated;
create trigger budget_revision before update on public.project_budgets for each row execute function private.check_cost_revision();
create trigger cost_revision before update on public.project_costs for each row execute function private.check_cost_revision();
create function public.project_cost_summary(p_organization_id uuid,p_project_id uuid)
returns table(budget_cents bigint,budget_revision integer,materials text,labor text,subcontractors text,other text,total text)
language sql stable security invoker set search_path='' as $$
 select b.budget_cents,b.revision,
 coalesce(sum(c.amount_cents) filter(where c.category='materials'),0)::text,
 coalesce(sum(c.amount_cents) filter(where c.category='labor'),0)::text,
 coalesce(sum(c.amount_cents) filter(where c.category='subcontractors'),0)::text,
 coalesce(sum(c.amount_cents) filter(where c.category='other'),0)::text,
 coalesce(sum(c.amount_cents),0)::text
 from public.projects p left join public.project_budgets b on b.organization_id=p.organization_id and b.project_id=p.id
 left join public.project_costs c on c.organization_id=p.organization_id and c.project_id=p.id and not c.voided
 where p.organization_id=p_organization_id and p.id=p_project_id
 group by p.organization_id,p.id,b.budget_cents,b.revision;
$$;
revoke all on function public.project_cost_summary(uuid,uuid) from public,anon;
grant execute on function public.project_cost_summary(uuid,uuid) to authenticated;

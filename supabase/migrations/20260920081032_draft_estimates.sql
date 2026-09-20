create table public.estimates (
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 project_id uuid not null,
 title text not null check(char_length(trim(title)) between 1 and 120),
 status text not null default 'draft' check(status='draft'),
 currency text not null default 'EUR' check(currency='EUR'),
 lines jsonb not null default '[]'::jsonb,
 total_cents bigint not null default 0 check(total_cents between 0 and 9007199254740991),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id)
);
create index estimates_project_created_idx on public.estimates(organization_id,project_id,created_at desc,id);
alter table public.estimates enable row level security;
revoke all on public.estimates from anon,authenticated;
grant select on public.estimates to authenticated;
grant insert(organization_id,id,project_id,title,lines) on public.estimates to authenticated;
grant update(title,lines,revision) on public.estimates to authenticated;
create policy estimates_read on public.estimates for select to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()))
);
create policy estimates_create on public.estimates for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
);
create policy estimates_update on public.estimates for update to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
) with check (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')
);
create function private.validate_estimate() returns trigger language plpgsql security invoker set search_path='' as $$
declare line jsonb; amount numeric; total numeric:=0; ids text[]:='{}';
begin
 if tg_op='UPDATE' and new.revision<>old.revision+1 then
  raise exception 'Stale estimate revision' using errcode='40001';
 end if;
 if jsonb_typeof(new.lines)<>'array' then raise exception 'Lines must be an array' using errcode='22023'; end if;
 if jsonb_array_length(new.lines)>100 then raise exception 'Too many lines' using errcode='22023'; end if;
 for line in select value from jsonb_array_elements(new.lines) loop
  if jsonb_typeof(line)<>'object' or
   not (line ?& array['id','description','quantity','price','unit']) or
   jsonb_typeof(line->'id')<>'string' or
   jsonb_typeof(line->'description')<>'string' or
   jsonb_typeof(line->'quantity')<>'string' or
   jsonb_typeof(line->'price')<>'string' or
   jsonb_typeof(line->'unit')<>'string' or
   char_length(line->>'id') not between 1 and 80 or
   char_length(trim(line->>'description')) not between 1 and 500 or
   (line->>'quantity') !~ '^[0-9]{1,7}([.][0-9]{1,2})?$' or
   (line->>'price') !~ '^[0-9]{1,7}([.][0-9]{1,2})?$' or
   (line->>'unit') not in ('m²','fixed','item') or
   (line->>'id')=any(ids) then
   raise exception 'Invalid estimate line' using errcode='22023';
  end if;
  if (line->>'quantity')::numeric<=0 then raise exception 'Quantity must be positive' using errcode='22023'; end if;
  ids:=array_append(ids,line->>'id');
  amount:=round((line->>'quantity')::numeric*(line->>'price')::numeric*100);
  total:=total+amount;
 end loop;
 if total>9007199254740991 then raise exception 'Total out of range' using errcode='22003'; end if;
 new.total_cents:=total::bigint;
 return new;
end;
$$;
revoke all on function private.validate_estimate() from public,anon,authenticated;
create trigger estimates_validate before insert or update on public.estimates for each row execute function private.validate_estimate();

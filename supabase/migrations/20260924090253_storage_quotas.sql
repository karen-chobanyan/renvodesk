-- Account and organization object-storage quotas. Storage object bytes are always
-- mutated through the Storage API; these private tables account for reservations.
-- Lock existing write sources while backfilling, so no reservation escapes the
-- ledger between its snapshot and trigger installation.
lock table public.organizations, public.project_files, public.sketch_saves
  in share row exclusive mode;

create table private.account_storage_quota (
 account_id uuid primary key references auth.users(id),
 limit_bytes bigint not null default 1000000000 check (limit_bytes >= 0),
 used_bytes bigint not null default 0 check (used_bytes >= 0),
 reserved_bytes bigint not null default 0 check (reserved_bytes >= 0)
);
create table private.workspace_storage_quota (
 organization_id uuid primary key references public.organizations(id),
 account_id uuid not null references auth.users(id),
 limit_bytes bigint not null default 1000000000 check (limit_bytes >= 0),
 used_bytes bigint not null default 0 check (used_bytes >= 0),
 reserved_bytes bigint not null default 0 check (reserved_bytes >= 0)
);
create index workspace_storage_quota_account_idx
 on private.workspace_storage_quota(account_id);
create table private.storage_allocations (
 source_kind text not null check (source_kind in ('file','sketch')),
 organization_id uuid not null references public.organizations(id),
 source_id uuid not null,
 account_id uuid not null references auth.users(id),
 bytes bigint not null check (bytes > 0),
 state text not null check (state in ('reserved','used','released')),
 created_at timestamptz not null default now(),
 primary key (source_kind,organization_id,source_id)
);
create index storage_allocations_account_idx
 on private.storage_allocations(account_id,state);
alter table private.account_storage_quota enable row level security;
alter table private.workspace_storage_quota enable row level security;
alter table private.storage_allocations enable row level security;
revoke all on private.account_storage_quota,
 private.workspace_storage_quota, private.storage_allocations from public,anon,authenticated;

insert into private.account_storage_quota(account_id)
 select distinct created_by from public.organizations;
insert into private.workspace_storage_quota(organization_id,account_id)
 select id,created_by from public.organizations;

-- Abort rather than silently attribute existing content to a non-owner.
do $$ begin
 if exists (
  select 1 from public.organizations o where not exists (
   select 1 from public.organization_memberships m
   where m.organization_id=o.id and m.user_id=o.created_by and m.role='owner'
  )
 ) then raise exception 'Storage quota backfill requires creator ownership'; end if;
 if exists (
  select 1 from public.project_files f join storage.objects o
   on o.bucket_id='project-files' and o.name=f.object_key
  where (o.metadata->>'size')::bigint is distinct from f.size_bytes
 ) or exists (
  select 1 from public.sketch_saves s join storage.objects o
   on o.bucket_id='project-sketches' and o.name=s.scene_key
  where (o.metadata->>'size')::bigint is distinct from s.scene_bytes
 ) or exists (
  select 1 from public.sketch_saves s join storage.objects o
   on o.bucket_id='project-sketches' and o.name=s.preview_key
  where (o.metadata->>'size')::bigint is distinct from s.preview_bytes
 ) then raise exception 'Storage quota backfill found mismatched object sizes'; end if;
 if exists (
  select 1 from storage.objects o where o.bucket_id='project-files'
   and not exists(select 1 from public.project_files f where f.object_key=o.name)
 ) or exists (
  select 1 from storage.objects o where o.bucket_id='project-sketches'
   and not exists(select 1 from public.sketch_saves s
    where s.scene_key=o.name or s.preview_key=o.name)
 ) then raise exception 'Storage quota backfill found orphan objects'; end if;
 if exists (
  select 1 from public.project_files f left join storage.objects o
   on o.bucket_id='project-files' and o.name=f.object_key
  where (f.state='ready' and o.id is null)
   or (f.state='deleted' and o.id is not null)
 ) or exists (
  select 1 from public.sketch_saves s
   left join storage.objects sc on sc.bucket_id='project-sketches'
    and sc.name=s.scene_key
   left join storage.objects pr on pr.bucket_id='project-sketches'
    and pr.name=s.preview_key
  where s.committed_at is not null and (sc.id is null or pr.id is null)
 ) then raise exception 'Storage quota backfill found invalid lifecycle state'; end if;
end $$;

insert into private.storage_allocations
 (source_kind,organization_id,source_id,account_id,bytes,state)
 select 'file',f.organization_id,f.id,o.created_by,f.size_bytes,
  case when f.state='pending' then 'reserved' else 'used' end
 from public.project_files f join public.organizations o on o.id=f.organization_id
 where f.state<>'deleted'
 union all
 select 'sketch',s.organization_id,s.id,o.created_by,
  s.scene_bytes::bigint+s.preview_bytes::bigint,
  case when s.committed_at is null then 'reserved' else 'used' end
 from public.sketch_saves s join public.organizations o on o.id=s.organization_id;

with totals as (
 select account_id,
  coalesce(sum(bytes) filter(where state='used'),0) used,
  coalesce(sum(bytes) filter(where state='reserved'),0) reserved
 from private.storage_allocations group by account_id
) update private.account_storage_quota q
 set used_bytes=t.used,reserved_bytes=t.reserved
 from totals t where q.account_id=t.account_id;
with totals as (
 select organization_id,
  coalesce(sum(bytes) filter(where state='used'),0) used,
  coalesce(sum(bytes) filter(where state='reserved'),0) reserved
 from private.storage_allocations group by organization_id
) update private.workspace_storage_quota q
 set used_bytes=t.used,reserved_bytes=t.reserved
 from totals t where q.organization_id=t.organization_id;

create function private.initialize_storage_quota() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 insert into private.account_storage_quota(account_id) values(new.created_by)
  on conflict do nothing;
 insert into private.workspace_storage_quota(organization_id,account_id)
  values(new.id,new.created_by);
 return new;
end $$;
revoke all on function private.initialize_storage_quota() from public,anon,authenticated;
create trigger organization_storage_quota after insert on public.organizations
 for each row execute function private.initialize_storage_quota();

-- All allocation changes lock account first, workspace second. The source row
-- is already locked by its INSERT/UPDATE. Counters and ledger share a transaction.
create function private.reserve_storage(p_kind text,p_org uuid,p_id uuid,p_bytes bigint)
 returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid;
begin
 if auth.uid() is null or p_bytes is null or p_bytes<=0 then
  raise exception 'Invalid storage reservation' using errcode='22023'; end if;
 select o.created_by into v_account from public.organizations o
 where o.id=p_org and exists(
  select 1 from public.organization_memberships m
  where m.organization_id=o.id and m.user_id=auth.uid() and m.role='owner');
 if v_account is null then raise exception 'Owner required' using errcode='42501'; end if;
 update private.account_storage_quota q
 set reserved_bytes=q.reserved_bytes+p_bytes where q.account_id=v_account
 and q.used_bytes+q.reserved_bytes+p_bytes<=q.limit_bytes;
 if not found then raise exception 'Account storage quota exceeded'
  using errcode='PZ101'; end if;
 update private.workspace_storage_quota q
 set reserved_bytes=q.reserved_bytes+p_bytes where q.organization_id=p_org
 and q.account_id=v_account
 and q.used_bytes+q.reserved_bytes+p_bytes<=q.limit_bytes;
 if not found then raise exception 'Workspace storage quota exceeded'
  using errcode='PZ102'; end if;
 insert into private.storage_allocations
  (source_kind,organization_id,source_id,account_id,bytes,state)
 values(p_kind,p_org,p_id,v_account,p_bytes,'reserved');
end $$;
revoke all on function private.reserve_storage(text,uuid,uuid,bigint)
 from public,anon,authenticated;

create function private.allocate_file_storage() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 perform private.reserve_storage('file',new.organization_id,new.id,new.size_bytes);
 return new;
end $$;
create function private.allocate_sketch_storage() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 perform private.reserve_storage('sketch',new.organization_id,new.id,
  new.scene_bytes::bigint+new.preview_bytes::bigint);
 return new;
end $$;
revoke all on function private.allocate_file_storage(),
 private.allocate_sketch_storage() from public,anon,authenticated;
create trigger allocate_file_storage after insert on public.project_files
 for each row execute function private.allocate_file_storage();
create trigger allocate_sketch_storage after insert on public.sketch_saves
 for each row execute function private.allocate_sketch_storage();

create function private.transition_storage_allocation(p_kind text,p_org uuid,
 p_id uuid,p_target text) returns void
 language plpgsql security definer set search_path='' as $$
declare a private.storage_allocations;
begin
 select * into a from private.storage_allocations
  where source_kind=p_kind and organization_id=p_org and source_id=p_id for update;
 if not found then raise exception 'Storage allocation missing' using errcode='PZ103'; end if;
 if a.state=p_target then return; end if;
 if a.state='released' or (a.state='reserved' and p_target not in ('used','released'))
  or (a.state='used' and p_target<>'released') then
  raise exception 'Invalid storage allocation transition' using errcode='22023'; end if;
 update private.account_storage_quota q set
  reserved_bytes=q.reserved_bytes-case when a.state='reserved' then a.bytes else 0 end,
  used_bytes=q.used_bytes+case when p_target='used' then a.bytes else 0 end
   -case when a.state='used' then a.bytes else 0 end
 where q.account_id=a.account_id;
 if not found then raise exception 'Account quota missing' using errcode='PZ103'; end if;
 update private.workspace_storage_quota q set
  reserved_bytes=q.reserved_bytes-case when a.state='reserved' then a.bytes else 0 end,
  used_bytes=q.used_bytes+case when p_target='used' then a.bytes else 0 end
   -case when a.state='used' then a.bytes else 0 end
 where q.organization_id=a.organization_id;
 if not found then raise exception 'Workspace quota missing' using errcode='PZ103'; end if;
 update private.storage_allocations set state=p_target
 where source_kind=p_kind and organization_id=p_org and source_id=p_id;
end $$;
revoke all on function private.transition_storage_allocation(text,uuid,uuid,text)
 from public,anon,authenticated;

create function private.file_storage_transition() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if old.state<>new.state then
  if old.state='pending' and new.state='ready' then
   perform private.transition_storage_allocation('file',new.organization_id,new.id,'used');
  elsif new.state='deleted' then
   perform private.transition_storage_allocation('file',new.organization_id,new.id,'released');
  end if;
 end if;
 return new;
end $$;
revoke all on function private.file_storage_transition() from public,anon,authenticated;
create trigger file_storage_transition after update of state on public.project_files
 for each row execute function private.file_storage_transition();

alter table public.sketch_saves add column canceled_at timestamptz,
 add column cancellation_finalized_at timestamptz,
 add constraint sketch_cancellation_order check(
  (canceled_at is null and cancellation_finalized_at is null)
  or (committed_at is null and canceled_at is not null
   and (cancellation_finalized_at is null
    or cancellation_finalized_at>=canceled_at))
 );
create function private.sketch_storage_transition() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if old.committed_at is null and new.committed_at is not null then
  perform private.transition_storage_allocation('sketch',new.organization_id,new.id,'used');
 elsif old.cancellation_finalized_at is null
  and new.cancellation_finalized_at is not null then
  perform private.transition_storage_allocation('sketch',new.organization_id,new.id,'released');
 end if;
 return new;
end $$;
revoke all on function private.sketch_storage_transition() from public,anon,authenticated;
create trigger sketch_storage_transition after update of committed_at,cancellation_finalized_at
 on public.sketch_saves for each row execute function private.sketch_storage_transition();

create function private.cancel_sketch_save(p_org uuid,p_save uuid)
 returns void language plpgsql security definer set search_path='' as $$
declare s public.sketch_saves;
begin
 if auth.uid() is null or not exists(
  select 1 from public.organization_memberships m
  where m.organization_id=p_org and m.user_id=auth.uid() and m.role='owner')
 then raise exception 'Owner required' using errcode='42501'; end if;
 select * into s from public.sketch_saves where organization_id=p_org and id=p_save for update;
 if not found or s.committed_at is not null then
  raise exception 'Sketch save unavailable' using errcode='42501'; end if;
 if s.canceled_at is null then
  update public.sketch_saves set canceled_at=now()
  where organization_id=p_org and id=p_save;
 end if;
end $$;
create function private.finalize_sketch_cancellation(p_org uuid,p_save uuid)
 returns void language plpgsql security definer set search_path='' as $$
declare s public.sketch_saves;
begin
 if auth.uid() is null or not exists(
  select 1 from public.organization_memberships m
  where m.organization_id=p_org and m.user_id=auth.uid() and m.role='owner')
 then raise exception 'Owner required' using errcode='42501'; end if;
 select * into s from public.sketch_saves where organization_id=p_org and id=p_save for update;
 if not found or s.committed_at is not null or s.canceled_at is null then
  raise exception 'Sketch cancellation unavailable' using errcode='42501'; end if;
 if s.cancellation_finalized_at is not null then return; end if;
 if exists(select 1 from storage.objects o where o.bucket_id='project-sketches'
  and o.name in(s.scene_key,s.preview_key)) then
  raise exception 'Sketch objects remain' using errcode='22023'; end if;
 update public.sketch_saves set cancellation_finalized_at=now()
 where organization_id=p_org and id=p_save;
end $$;
revoke all on function private.cancel_sketch_save(uuid,uuid),
 private.finalize_sketch_cancellation(uuid,uuid) from public,anon;
grant execute on function private.cancel_sketch_save(uuid,uuid),
 private.finalize_sketch_cancellation(uuid,uuid) to authenticated;
create function public.cancel_sketch_save(p_org uuid,p_save uuid) returns void
 language sql security invoker set search_path='' as $$
 select private.cancel_sketch_save(p_org,p_save)
$$;
create function public.finalize_sketch_cancellation(p_org uuid,p_save uuid)
 returns void language sql security invoker set search_path='' as $$
 select private.finalize_sketch_cancellation(p_org,p_save)
$$;
revoke all on function public.cancel_sketch_save(uuid,uuid),
 public.finalize_sketch_cancellation(uuid,uuid) from public,anon;
grant execute on function public.cancel_sketch_save(uuid,uuid),
 public.finalize_sketch_cancellation(uuid,uuid) to authenticated;

create or replace function private.can_upload_sketch(p_path text,p_metadata jsonb)
 returns boolean language plpgsql security definer set search_path='' as $$
declare s public.sketch_saves; expected_bytes bigint; expected_mime text;
begin
 if auth.uid() is null then return false; end if;
 select * into s from public.sketch_saves
  where scene_key=p_path or preview_key=p_path for share;
 if not found or s.committed_at is not null or s.canceled_at is not null
  or not exists(select 1 from public.organization_memberships m
   where m.organization_id=s.organization_id and m.user_id=auth.uid()
   and m.role='owner') then return false; end if;
 expected_bytes:=case when p_path=s.scene_key then s.scene_bytes else s.preview_bytes end;
 expected_mime:=case when p_path=s.scene_key then 'application/json' else 'image/png' end;
 -- Storage's preflight authorization has no final size. Its final INSERT does.
 return p_metadata->>'mimetype'=expected_mime and (
  p_metadata->>'size' is null or
  (p_metadata->>'size' ~ '^[0-9]+$'
   and (p_metadata->>'size')::bigint=expected_bytes));
end $$;
revoke all on function private.can_upload_sketch(text,jsonb) from public,anon;
grant execute on function private.can_upload_sketch(text,jsonb) to authenticated;
drop policy sketch_objects_create on storage.objects;
create policy sketch_objects_create on storage.objects for insert to authenticated
 with check(bucket_id='project-sketches' and private.can_upload_sketch(name,metadata));
drop function private.can_upload_sketch(text);

create or replace function private.can_upload_project_file(p_path text,p_metadata jsonb)
 returns boolean language plpgsql security definer set search_path='' as $$
declare f public.project_files;
begin
 if auth.uid() is null then return false; end if;
 select * into f from public.project_files where object_key=p_path for share;
 if not found or f.state<>'pending' or not exists(
  select 1 from public.organization_memberships m
  where m.organization_id=f.organization_id and m.user_id=auth.uid() and m.role='owner'
 ) then return false; end if;
 return p_metadata->>'mimetype'=f.mime_type and (
  p_metadata->>'size' is null or
  (p_metadata->>'size' ~ '^[0-9]+$'
   and (p_metadata->>'size')::bigint=f.size_bytes));
end $$;
revoke all on function private.can_upload_project_file(text,jsonb) from public,anon;
grant execute on function private.can_upload_project_file(text,jsonb) to authenticated;
drop policy project_objects_create on storage.objects;
create policy project_objects_create on storage.objects for insert to authenticated
 with check(bucket_id='project-files'
  and private.can_upload_project_file(name,metadata));
drop function private.can_upload_project_file(text);

create function private.can_delete_canceled_sketch(p_path text) returns boolean
 language plpgsql security definer set search_path='' as $$
declare s public.sketch_saves;
begin
 if auth.uid() is null then return false; end if;
 select * into s from public.sketch_saves
 where scene_key=p_path or preview_key=p_path for share;
 return found and s.committed_at is null and s.canceled_at is not null
  and exists(select 1 from public.organization_memberships m
   where m.organization_id=s.organization_id and m.user_id=auth.uid()
    and m.role='owner');
end $$;
revoke all on function private.can_delete_canceled_sketch(text) from public,anon;
grant execute on function private.can_delete_canceled_sketch(text) to authenticated;
create policy canceled_sketch_objects_delete on storage.objects for delete
 to authenticated using(bucket_id='project-sketches'
  and private.can_delete_canceled_sketch(name));

-- The existing publish function's authorization, revision and object checks are
-- retained; cancellation adds one guard before revision publication.
create or replace function private.publish_sketch(p_org uuid,p_sketch uuid,p_save uuid)
 returns integer language plpgsql security definer set search_path='' as $$
declare sk public.project_sketches; s public.sketch_saves;
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships
  where organization_id=p_org and user_id=auth.uid() and role='owner') then
  raise exception 'Owner required' using errcode='42501'; end if;
 select * into sk from public.project_sketches
  where organization_id=p_org and id=p_sketch for update;
 if not found then raise exception 'Sketch unavailable' using errcode='42501'; end if;
 select * into s from public.sketch_saves
  where organization_id=p_org and sketch_id=p_sketch and id=p_save for update;
 if not found or s.canceled_at is not null then
  raise exception 'Save unavailable' using errcode='42501'; end if;
 if s.committed_at is not null then return s.revision; end if;
 if sk.revision<>s.base_revision then raise exception 'Sketch changed'
  using errcode='40001'; end if;
 if not exists(select 1 from storage.objects where bucket_id='project-sketches'
  and name=s.scene_key and metadata->>'mimetype'='application/json'
  and (metadata->>'size')::bigint=s.scene_bytes)
 or not exists(select 1 from storage.objects where bucket_id='project-sketches'
  and name=s.preview_key and metadata->>'mimetype'='image/png'
  and (metadata->>'size')::bigint=s.preview_bytes) then
  raise exception 'Upload incomplete' using errcode='22023'; end if;
 update public.sketch_saves set revision=base_revision+1,committed_at=now()
  where organization_id=p_org and id=p_save;
 update public.project_sketches set title=s.title,revision=s.base_revision+1,
  current_save_id=s.id,updated_at=now()
  where organization_id=p_org and id=p_sketch;
 return s.base_revision+1;
end $$;

create function private.read_storage_usage(p_org uuid)
 returns table(account_limit_bytes bigint,account_used_bytes bigint,
 account_reserved_bytes bigint,workspace_limit_bytes bigint,
 workspace_used_bytes bigint,workspace_reserved_bytes bigint)
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.organizations o
  join public.organization_memberships m on m.organization_id=o.id
  where o.id=p_org and o.created_by=auth.uid()
   and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Owner required' using errcode='42501'; end if;
 return query select a.limit_bytes,a.used_bytes,a.reserved_bytes,
  w.limit_bytes,w.used_bytes,w.reserved_bytes
 from private.workspace_storage_quota w
 join private.account_storage_quota a on a.account_id=w.account_id
 where w.organization_id=p_org and a.account_id=auth.uid();
 if not found then raise exception 'Storage accounting unavailable'
  using errcode='PZ103'; end if;
end $$;
revoke all on function private.read_storage_usage(uuid) from public,anon;
grant execute on function private.read_storage_usage(uuid) to authenticated;
create function public.read_storage_usage(p_org uuid)
 returns table(account_limit_bytes bigint,account_used_bytes bigint,
 account_reserved_bytes bigint,workspace_limit_bytes bigint,
 workspace_used_bytes bigint,workspace_reserved_bytes bigint)
 language sql security invoker set search_path='' as $$
 select * from private.read_storage_usage(p_org)
$$;
revoke all on function public.read_storage_usage(uuid) from public,anon;
grant execute on function public.read_storage_usage(uuid) to authenticated;

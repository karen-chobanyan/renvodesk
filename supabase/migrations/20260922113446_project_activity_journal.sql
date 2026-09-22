-- The journal is an append-only projection of successful business writes.
create table public.project_activity (
 organization_id uuid not null,
 project_id uuid not null,
 id uuid not null default gen_random_uuid(),
 occurred_at timestamptz not null default now(),
 actor_user_id uuid not null,
 event_type text not null check(event_type in ('project.created','project.updated','task.created','task.updated','task.deleted','estimate.created','estimate.updated','estimate.sent','estimate.accepted','estimate.declined','budget.created','budget.updated','cost.created','cost.updated','cost.voided','file.added','file.deleted','sketch.created','sketch.published')),
 category text not null check(category in ('project','tasks','estimates','costs','documents')),
 visibility text not null check(visibility in ('member','owner')),
 entity_type text not null check(entity_type in ('project','task','estimate','budget','cost','file','sketch')),
 entity_id uuid not null,
 source_key text not null check(length(source_key) between 1 and 180),
 payload_version integer not null default 1 check(payload_version=1),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=4096),
 primary key(organization_id,id),
 unique(organization_id,source_key),
 foreign key(organization_id,project_id) references public.projects(organization_id,id),
 check(visibility=case when category in ('estimates','costs') then 'owner' else 'member' end)
);
create index project_activity_feed_idx on public.project_activity(organization_id,project_id,occurred_at desc,id desc);
alter table public.project_activity enable row level security;
revoke all on public.project_activity from public,anon,authenticated;
grant select on public.project_activity to authenticated;
create policy project_activity_read on public.project_activity for select to authenticated using (
 organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and (project_activity.visibility='member' or role='owner'))
);
create table public.project_activity_tracking (
 singleton boolean primary key default true check(singleton),
 started_at timestamptz not null default now()
);
insert into public.project_activity_tracking default values;
alter table public.project_activity_tracking enable row level security;
revoke all on public.project_activity_tracking from public,anon,authenticated;
grant select on public.project_activity_tracking to authenticated;
create policy activity_tracking_read on public.project_activity_tracking for select to authenticated using (
 exists(select 1 from public.organization_memberships where user_id=(select auth.uid()))
);
-- Remember ready provenance without logging pending-upload cancellation as deletion.
-- Only ready files are certain at rollout; old in-flight deletions are not inferred.
alter table public.project_files add column activity_was_ready boolean not null default false;
update public.project_files set activity_was_ready=true where state='ready';
create function private.track_file_ready() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.activity_was_ready := old.activity_was_ready or (old.state='pending' and new.state='ready');
 return new;
end $$;
revoke all on function private.track_file_ready() from public,anon,authenticated;
create trigger project_file_ready_history before update on public.project_files for each row execute function private.track_file_ready();

-- Fixed source allowlist. No callable append RPC, dynamic SQL, or client payloads.
-- SECURITY DEFINER permits only this internal append while source RLS stays intact.
create function private.capture_project_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare
 r jsonb; previous jsonb := '{}'::jsonb; fields text[]; changed text[] := '{}';
 org uuid; project uuid; entity uuid; kind text; category text; action text;
 label text; source text; details jsonb := '{}'::jsonb; field text; member_role text;
begin
 if tg_table_schema<>'public' then raise exception 'Unsupported activity source'; end if;
 if tg_op='DELETE' then r:=to_jsonb(old); else r:=to_jsonb(new); end if;
 if tg_op='UPDATE' then previous:=to_jsonb(old); end if;
 org:=(r->>'organization_id')::uuid;
 entity:=(r->>'id')::uuid;
 project:=(r->>'project_id')::uuid;
 case tg_table_name
 when 'projects' then
  kind:='project'; category:='project'; project:=entity; label:=r->>'name';
  fields:=array['name','client_name','city','address','status','client_id','property_id'];
 when 'project_tasks' then
  kind:='task'; category:='tasks'; label:=r->>'title';
  fields:=array['title','notes','status','start_date','due_date','assignee_id'];
 when 'estimates' then
  -- Decision events are captured solely through estimate_events.
  if r->>'status'<>'draft' then return null; end if;
  kind:='estimate'; category:='estimates'; label:=r->>'title'; fields:=array['title','lines'];
  details:=jsonb_build_object('amount_cents',r->>'total_cents');
 when 'estimate_events' then
  kind:='estimate'; category:='estimates'; entity:=(r->>'estimate_id')::uuid;
  action:=r->>'to_status'; source:='estimate-event:'||(r->>'id');
  select title into label from public.estimates where organization_id=org and id=entity and project_id=project;
 when 'project_budgets' then
  kind:='budget'; category:='costs'; entity:=project; fields:=array['budget_cents'];
  details:=jsonb_build_object('amount_cents',r->>'budget_cents');
 when 'project_costs' then
  kind:='cost'; category:='costs'; label:=r->>'description';
  fields:=array['description','category','amount_cents','incurred_on','notes','voided'];
  details:=jsonb_build_object('amount_cents',r->>'amount_cents');
  if tg_op='UPDATE' and r->>'voided'='true' and previous->>'voided'='false' then action:='voided'; end if;
 when 'project_files' then
  kind:='file'; category:='documents'; label:=r->>'original_name';
  if previous->>'state'='pending' and r->>'state'='ready' then action:='added';
  elsif previous->>'state'='deleting' and r->>'state'='deleted' and r->>'activity_was_ready'='true' then action:='deleted';
  else return null; end if;
  source:='file:'||entity::text||':'||action;
 when 'project_sketches' then
  kind:='sketch'; category:='documents'; label:=r->>'title';
 when 'sketch_saves' then
  if previous->>'committed_at' is not null or r->>'committed_at' is null then return null; end if;
  kind:='sketch'; category:='documents'; entity:=(r->>'sketch_id')::uuid;
  label:=r->>'title'; action:='published'; source:='sketch-save:'||(r->>'id');
  details:=jsonb_build_object('revision',r->'revision');
 else raise exception 'Unsupported activity source';
 end case;
 if tg_op='UPDATE' and fields is not null then
  foreach field in array fields loop
   if r->field is distinct from previous->field then changed:=array_append(changed,field); end if;
  end loop;
  if cardinality(changed)=0 then return null; end if;
  details:=details||jsonb_build_object('changed_fields',to_jsonb(changed));
  if 'status'=any(changed) then details:=details||jsonb_build_object('from_status',previous->>'status','to_status',r->>'status'); end if;
 end if;
 if action is null then action:=case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' when 'DELETE' then 'deleted' end; end if;
 if source is null then source:=kind||':'||entity::text||':'||action||':'||coalesce(r->>'revision','0'); end if;
 if auth.uid() is null then raise exception 'Activity actor required' using errcode='42501'; end if;
 select role into member_role from public.organization_memberships where organization_id=org and user_id=auth.uid();
 if member_role is null or (member_role<>'owner' and not (kind='task' and tg_op='UPDATE' and (previous->>'assignee_id')::uuid=auth.uid() and (r->>'assignee_id')::uuid=auth.uid())) then
  raise exception 'Activity source access denied' using errcode='42501';
 end if;
 if label is not null then details:=details||jsonb_build_object('label',left(label,255)); end if;
 insert into public.project_activity(organization_id,project_id,actor_user_id,event_type,category,visibility,entity_type,entity_id,source_key,payload)
 values(org,project,auth.uid(),kind||'.'||action,category,case when category in ('estimates','costs') then 'owner' else 'member' end,kind,entity,source,details);
 -- Source transactions already deduplicate retries; a source-key collision is a
 -- regression and rolls back the write rather than silently losing an event.
 return null;
end $$;
revoke all on function private.capture_project_activity() from public,anon,authenticated;
create trigger activity_projects after insert or update on public.projects for each row execute function private.capture_project_activity();
create trigger activity_tasks after insert or update or delete on public.project_tasks for each row execute function private.capture_project_activity();
create trigger activity_estimates after insert or update on public.estimates for each row execute function private.capture_project_activity();
create trigger activity_estimate_events after insert on public.estimate_events for each row execute function private.capture_project_activity();
create trigger activity_budgets after insert or update on public.project_budgets for each row execute function private.capture_project_activity();
create trigger activity_costs after insert or update on public.project_costs for each row execute function private.capture_project_activity();
create trigger activity_files after update on public.project_files for each row execute function private.capture_project_activity();
create trigger activity_sketches after insert on public.project_sketches for each row execute function private.capture_project_activity();
create trigger activity_sketch_saves after update on public.sketch_saves for each row execute function private.capture_project_activity();

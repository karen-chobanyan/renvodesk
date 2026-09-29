-- Durable AI site-note analyses (decision 030). The API writes with the
-- requesting owner's token through constrained private functions; clients have
-- no direct write grants. Content is kept 30 days, then purged by pg_cron.

create table public.site_note_analyses (
 organization_id uuid not null references public.organizations(id),
 id uuid not null default gen_random_uuid(),
 project_id uuid not null,
 file_id uuid not null,
 request_id uuid not null,
 requested_by uuid not null references auth.users(id),
 status text not null default 'queued'
  check (status in ('queued','transcribing','proposing','ready','failed')),
 failure_reason text check (failure_reason ~ '^[a-z_]{1,64}$'),
 transcription_model text not null check (transcription_model ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
 proposal_model text not null check (proposal_model ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
 prompt_version text not null check (prompt_version ~ '^[0-9a-f]{12}$'),
 transcript text check (char_length(transcript) between 1 and 15000),
 summary text check (char_length(summary) <= 1000),
 proposal_status text check (proposal_status in ('ready','unavailable')),
 proposal jsonb check (jsonb_typeof(proposal) = 'array' and jsonb_array_length(proposal) <= 5),
 omitted_task_count integer check (omitted_task_count >= 0),
 usage jsonb not null default '{}' check (jsonb_typeof(usage) = 'object'),
 lease_expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 expires_at timestamptz,
 purged_at timestamptz,
 primary key (organization_id, id),
 unique (organization_id, request_id),
 foreign key (organization_id, project_id) references public.projects(organization_id, id),
 foreign key (organization_id, file_id) references public.project_files(organization_id, id),
 check ((status = 'ready') = (completed_at is not null and proposal_status is not null)
        or status = 'failed'),
 check (status <> 'failed' or failure_reason is not null)
);
create index site_note_analyses_reuse_idx on public.site_note_analyses
 (organization_id, file_id, prompt_version, transcription_model, proposal_model)
 where status = 'ready' and purged_at is null;
create index site_note_analyses_running_idx on public.site_note_analyses (requested_by)
 where status in ('queued','transcribing','proposing');
create index site_note_analyses_purge_idx on public.site_note_analyses (expires_at)
 where purged_at is null;

alter table public.site_note_analyses enable row level security;
revoke all on public.site_note_analyses from public, anon, authenticated;
grant select on public.site_note_analyses to authenticated;
create policy site_note_analyses_owner_read on public.site_note_analyses
 for select to authenticated using (
  (expires_at is null or expires_at > now())
  and exists (select 1 from public.organization_memberships m
   where m.organization_id = site_note_analyses.organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));

-- Operator-managed settings, entitlements and counters (no client grants).
create table private.ai_site_note_settings (
 id boolean primary key default true check (id),
 company_daily_limit integer not null default 30 check (company_daily_limit >= 0),
 global_monthly_limit integer not null default 2000 check (global_monthly_limit >= 0),
 retention_days integer not null default 30 check (retention_days between 1 and 365),
 lease_seconds integer not null default 300 check (lease_seconds between 60 and 3600)
);
insert into private.ai_site_note_settings default values;
create table private.ai_site_note_entitlements (
 organization_id uuid primary key references public.organizations(id),
 enabled boolean not null default false,
 daily_limit integer check (daily_limit >= 0)
);
create table private.ai_site_note_company_usage (
 organization_id uuid not null references public.organizations(id),
 day date not null,
 used integer not null default 0 check (used >= 0),
 primary key (organization_id, day)
);
create table private.ai_site_note_global_usage (
 month date primary key check (extract(day from month) = 1),
 used integer not null default 0 check (used >= 0)
);
alter table private.ai_site_note_settings enable row level security;
alter table private.ai_site_note_entitlements enable row level security;
alter table private.ai_site_note_company_usage enable row level security;
alter table private.ai_site_note_global_usage enable row level security;
revoke all on private.ai_site_note_settings, private.ai_site_note_entitlements,
 private.ai_site_note_company_usage, private.ai_site_note_global_usage
 from public, anon, authenticated;

create function private.require_site_note_owner(p_org uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.organization_memberships m
  where m.organization_id = p_org and m.user_id = auth.uid() and m.role = 'owner'
 ) then raise exception 'Owner required' using errcode = '42501'; end if;
end $$;

-- Outcomes: created, existing (same request), reused (saved result, not
-- counted), file_unavailable, unsupported_audio, disabled, user_running,
-- company_daily, global_monthly. Only "created" consumes quota.
create function private.begin_site_note_analysis(
 p_org uuid, p_project uuid, p_file uuid, p_request uuid, p_prompt_version text,
 p_transcription_model text, p_proposal_model text
) returns table (analysis_id uuid, outcome text)
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_row public.site_note_analyses;
 v_mime text;
 v_settings private.ai_site_note_settings;
 v_enabled boolean;
 v_daily integer;
 v_day date := (now() at time zone 'Europe/Brussels')::date;
 v_month date := date_trunc('month', now() at time zone 'Europe/Brussels')::date;
 v_company_used integer;
 v_global_used integer;
begin
 perform private.require_site_note_owner(p_org);
 -- Serialize one user's starts so the running-job check cannot race.
 perform pg_advisory_xact_lock(hashtextextended('site_note:' || v_user::text, 0));

 select * into v_row from public.site_note_analyses a
  where a.organization_id = p_org and a.request_id = p_request;
 if found then
  if v_row.project_id <> p_project or v_row.file_id <> p_file
   or v_row.requested_by <> v_user or v_row.prompt_version <> p_prompt_version
   or v_row.transcription_model <> p_transcription_model
   or v_row.proposal_model <> p_proposal_model then
   raise exception 'Request ID reused with different arguments' using errcode = '22023';
  end if;
  return query select v_row.id, 'existing'::text; return;
 end if;

 select f.mime_type into v_mime from public.project_files f
  where f.organization_id = p_org and f.project_id = p_project and f.id = p_file
   and f.state = 'ready';
 if not found then return query select null::uuid, 'file_unavailable'::text; return; end if;
 if v_mime not in ('audio/webm','audio/mp4') then
  return query select null::uuid, 'unsupported_audio'::text; return;
 end if;

 select e.enabled, e.daily_limit into v_enabled, v_daily
  from private.ai_site_note_entitlements e where e.organization_id = p_org;
 if not coalesce(v_enabled, false) then
  return query select null::uuid, 'disabled'::text; return;
 end if;

 select a.id into v_row.id from public.site_note_analyses a
  where a.organization_id = p_org and a.file_id = p_file and a.status = 'ready'
   and a.purged_at is null and a.expires_at > now()
   and a.prompt_version = p_prompt_version
   and a.transcription_model = p_transcription_model
   and a.proposal_model = p_proposal_model
  order by a.completed_at desc limit 1;
 if v_row.id is not null then
  return query select v_row.id, 'reused'::text; return;
 end if;

 if exists (select 1 from public.site_note_analyses a
  where a.requested_by = v_user and a.status in ('queued','transcribing','proposing')
   and a.lease_expires_at > now()) then
  return query select null::uuid, 'user_running'::text; return;
 end if;

 select * into v_settings from private.ai_site_note_settings;
 -- Lock order: global counter, then company counter.
 insert into private.ai_site_note_global_usage(month) values (v_month) on conflict do nothing;
 select g.used into v_global_used from private.ai_site_note_global_usage g
  where g.month = v_month for update;
 insert into private.ai_site_note_company_usage(organization_id, day)
  values (p_org, v_day) on conflict do nothing;
 select c.used into v_company_used from private.ai_site_note_company_usage c
  where c.organization_id = p_org and c.day = v_day for update;
 if v_company_used >= coalesce(v_daily, v_settings.company_daily_limit) then
  return query select null::uuid, 'company_daily'::text; return;
 end if;
 if v_global_used >= v_settings.global_monthly_limit then
  return query select null::uuid, 'global_monthly'::text; return;
 end if;
 update private.ai_site_note_global_usage set used = used + 1 where month = v_month;
 update private.ai_site_note_company_usage set used = used + 1
  where organization_id = p_org and day = v_day;

 insert into public.site_note_analyses (organization_id, project_id, file_id, request_id,
  requested_by, transcription_model, proposal_model, prompt_version, lease_expires_at)
 values (p_org, p_project, p_file, p_request, v_user, p_transcription_model,
  p_proposal_model, p_prompt_version, now() + make_interval(secs => v_settings.lease_seconds))
 returning id into v_row.id;
 return query select v_row.id, 'created'::text;
end $$;

-- queued → transcribing → proposing, only by the requester while the lease holds.
create function private.advance_site_note_analysis(p_org uuid, p_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_lease integer;
begin
 perform private.require_site_note_owner(p_org);
 select lease_seconds into v_lease from private.ai_site_note_settings;
 update public.site_note_analyses a
  set status = p_status, lease_expires_at = now() + make_interval(secs => v_lease)
  where a.organization_id = p_org and a.id = p_id and a.requested_by = auth.uid()
   and a.lease_expires_at > now()
   and ((a.status = 'queued' and p_status = 'transcribing')
     or (a.status = 'transcribing' and p_status = 'proposing'));
 return found;
end $$;

create function private.complete_site_note_analysis(
 p_org uuid, p_id uuid, p_transcript text, p_summary text, p_proposal_status text,
 p_proposal jsonb, p_omitted integer, p_usage jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_retention integer;
begin
 perform private.require_site_note_owner(p_org);
 select retention_days into v_retention from private.ai_site_note_settings;
 update public.site_note_analyses a
  set status = 'ready', transcript = p_transcript, summary = p_summary,
   proposal_status = p_proposal_status, proposal = p_proposal,
   omitted_task_count = p_omitted, usage = coalesce(p_usage, '{}'),
   completed_at = now(), expires_at = now() + make_interval(days => v_retention)
  where a.organization_id = p_org and a.id = p_id and a.requested_by = auth.uid()
   and a.status = 'proposing' and a.lease_expires_at > now() and a.purged_at is null;
 return found;
end $$;

create function private.fail_site_note_analysis(p_org uuid, p_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_retention integer;
begin
 perform private.require_site_note_owner(p_org);
 select retention_days into v_retention from private.ai_site_note_settings;
 update public.site_note_analyses a
  set status = 'failed', failure_reason = p_reason, completed_at = now(),
   expires_at = now() + make_interval(days => v_retention)
  where a.organization_id = p_org and a.id = p_id and a.requested_by = auth.uid()
   and a.status in ('queued','transcribing','proposing');
 return found;
end $$;

create function private.site_note_ai_status(p_org uuid)
returns table (enabled boolean, remaining integer)
language plpgsql stable security definer set search_path = '' as $$
declare
 v_settings private.ai_site_note_settings;
 v_enabled boolean; v_daily integer; v_company integer; v_global integer;
begin
 perform private.require_site_note_owner(p_org);
 select * into v_settings from private.ai_site_note_settings;
 select e.enabled, e.daily_limit into v_enabled, v_daily
  from private.ai_site_note_entitlements e where e.organization_id = p_org;
 select coalesce(max(c.used), 0) into v_company from private.ai_site_note_company_usage c
  where c.organization_id = p_org and c.day = (now() at time zone 'Europe/Brussels')::date;
 select coalesce(max(g.used), 0) into v_global from private.ai_site_note_global_usage g
  where g.month = date_trunc('month', now() at time zone 'Europe/Brussels')::date;
 return query select coalesce(v_enabled, false), greatest(0, least(
  coalesce(v_daily, v_settings.company_daily_limit) - v_company,
  v_settings.global_monthly_limit - v_global));
end $$;

-- Public invoker wrappers; privileges live in the private definer functions.
create function public.begin_site_note_analysis(p_org uuid, p_project uuid, p_file uuid,
 p_request uuid, p_prompt_version text, p_transcription_model text, p_proposal_model text)
returns table (analysis_id uuid, outcome text) language sql security invoker set search_path = ''
as $$ select * from private.begin_site_note_analysis(p_org, p_project, p_file, p_request,
 p_prompt_version, p_transcription_model, p_proposal_model) $$;
create function public.advance_site_note_analysis(p_org uuid, p_id uuid, p_status text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.advance_site_note_analysis(p_org, p_id, p_status) $$;
create function public.complete_site_note_analysis(p_org uuid, p_id uuid, p_transcript text,
 p_summary text, p_proposal_status text, p_proposal jsonb, p_omitted integer, p_usage jsonb)
returns boolean language sql security invoker set search_path = ''
as $$ select private.complete_site_note_analysis(p_org, p_id, p_transcript, p_summary,
 p_proposal_status, p_proposal, p_omitted, p_usage) $$;
create function public.fail_site_note_analysis(p_org uuid, p_id uuid, p_reason text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.fail_site_note_analysis(p_org, p_id, p_reason) $$;
create function public.site_note_ai_status(p_org uuid)
returns table (enabled boolean, remaining integer) language sql stable security invoker
set search_path = '' as $$ select * from private.site_note_ai_status(p_org) $$;

do $$ declare sig text; s text; begin
 foreach s in array array['public','private'] loop
  foreach sig in array array[
   'begin_site_note_analysis(uuid,uuid,uuid,uuid,text,text,text)',
   'advance_site_note_analysis(uuid,uuid,text)',
   'complete_site_note_analysis(uuid,uuid,text,text,text,jsonb,integer,jsonb)',
   'fail_site_note_analysis(uuid,uuid,text)',
   'site_note_ai_status(uuid)'] loop
   execute 'revoke all on function ' || s || '.' || sig || ' from public, anon, authenticated';
   execute 'grant execute on function ' || s || '.' || sig || ' to authenticated';
  end loop;
 end loop;
end $$;
revoke all on function private.require_site_note_owner(uuid) from public, anon, authenticated;

-- Deleting a recording removes its transcripts in the same transaction.
create function private.purge_site_note_analyses_for_file() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.site_note_analyses a
  set transcript = null, summary = null, proposal = null, purged_at = now()
  where a.organization_id = new.organization_id and a.file_id = new.id
   and a.purged_at is null;
 return new;
end $$;
revoke all on function private.purge_site_note_analyses_for_file() from public, anon, authenticated;
create trigger project_file_purge_site_note_analyses
 after update of state on public.project_files for each row
 when (new.state = 'deleting' and old.state is distinct from 'deleting')
 execute function private.purge_site_note_analyses_for_file();

-- Daily retention purge. Also closes jobs whose lease expired (e.g. restart).
create function private.purge_expired_site_note_analyses() returns void
language plpgsql security definer set search_path = '' as $$
declare v_retention integer;
begin
 select retention_days into v_retention from private.ai_site_note_settings;
 update public.site_note_analyses
  set status = 'failed', failure_reason = 'lease_expired', completed_at = now(),
   expires_at = now() + make_interval(days => v_retention)
  where status in ('queued','transcribing','proposing') and lease_expires_at <= now();
 update public.site_note_analyses
  set transcript = null, summary = null, proposal = null, purged_at = now()
  where expires_at <= now() and purged_at is null;
end $$;
revoke all on function private.purge_expired_site_note_analyses() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-site-note-analyses', '17 3 * * *',
 'select private.purge_expired_site_note_analyses()');

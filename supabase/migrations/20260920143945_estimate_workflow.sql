alter table public.estimates drop constraint estimates_status_check;
alter table public.estimates add constraint estimates_status_check check(status in('draft','sent','accepted','declined'));
alter table public.estimates add column sent_snapshot jsonb;
alter table public.estimates add constraint estimates_snapshot_check check((status='draft' and sent_snapshot is null) or (status<>'draft' and sent_snapshot is not null and jsonb_typeof(sent_snapshot)='object'));
create table public.estimate_events(
 organization_id uuid not null,
 estimate_id uuid not null,
 project_id uuid not null,
 id uuid not null,
 from_revision integer not null,
 from_status text not null,
 to_status text not null check(to_status in('sent','accepted','declined')),
 note text not null check(length(btrim(note)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 recorded_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,estimate_id,from_revision),
 foreign key(organization_id,estimate_id) references public.estimates(organization_id,id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id)
);
alter table public.estimate_events enable row level security;
revoke all on public.estimate_events from anon,authenticated;
grant select on public.estimate_events to authenticated;
create policy estimate_events_owner_read on public.estimate_events for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create function private.freeze_sent_estimate() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status<>'draft' and (new.title is distinct from old.title or new.lines is distinct from old.lines or new.sent_snapshot is distinct from old.sent_snapshot) then raise exception 'Sent content is immutable' using errcode='22023'; end if;
 if new.status<>old.status and not ((old.status='draft' and new.status='sent') or(old.status='sent' and new.status in('accepted','declined'))) then raise exception 'Invalid transition' using errcode='22023'; end if;
 return new;
end $$;
revoke all on function private.freeze_sent_estimate() from public,anon,authenticated;
create trigger estimates_freeze before update on public.estimates for each row execute function private.freeze_sent_estimate();
create function private.record_estimate_event(p_org uuid,p_estimate uuid,p_project uuid,p_request uuid,p_revision integer,p_status text,p_note text) returns public.estimates language plpgsql security definer set search_path='' as $$
declare e public.estimates; previous public.estimate_events; snap jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships where organization_id=p_org and user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501'; end if;
 if p_request is null or p_status is null or p_status not in('sent','accepted','declined') or p_note is null or length(btrim(p_note)) not between 1 and 1000 then raise exception 'Invalid event' using errcode='22023'; end if;
 select * into e from public.estimates where organization_id=p_org and project_id=p_project and id=p_estimate for update;
 if not found then raise exception 'Estimate unavailable' using errcode='42501'; end if;
 select * into previous from public.estimate_events where organization_id=p_org and id=p_request;
 if found then
  if previous.estimate_id<>p_estimate or previous.project_id<>p_project or previous.from_revision is distinct from p_revision or previous.to_status<>p_status or previous.note<>btrim(p_note) then raise exception 'Request identity mismatch' using errcode='22023'; end if;
  return e;
 end if;
 if p_revision is null or e.revision<>p_revision then raise exception 'Estimate changed' using errcode='40001'; end if;
 if not ((e.status='draft' and p_status='sent') or(e.status='sent' and p_status in('accepted','declined'))) then raise exception 'Invalid transition' using errcode='22023'; end if;
 snap:=e.sent_snapshot;
 if p_status='sent' then
  if jsonb_array_length(e.lines)=0 then raise exception 'Empty estimate' using errcode='22023'; end if;
  select jsonb_build_object('title',e.title,'revision',e.revision,'lines',e.lines,'total_cents',e.total_cents,'company',jsonb_build_object('name',o.name,'country',o.country,'contact_address',o.contact_address,'contact_email',o.contact_email,'contact_phone',o.contact_phone),'project',jsonb_build_object('name',p.name,'client_name',p.client_name,'address',p.address,'city',p.city)) into snap from public.organizations o join public.projects p on p.organization_id=o.id where o.id=p_org and p.id=p_project;
 end if;
 insert into public.estimate_events(organization_id,estimate_id,project_id,id,from_revision,from_status,to_status,note,recorded_by) values(p_org,p_estimate,p_project,p_request,e.revision,e.status,p_status,btrim(p_note),auth.uid());
 update public.estimates set status=p_status,sent_snapshot=snap,revision=revision+1 where organization_id=p_org and id=p_estimate returning * into e;
 return e;
end $$;
create function public.record_estimate_event(p_org uuid,p_estimate uuid,p_project uuid,p_request uuid,p_revision integer,p_status text,p_note text) returns public.estimates language sql security invoker set search_path='' as $$select private.record_estimate_event(p_org,p_estimate,p_project,p_request,p_revision,p_status,p_note)$$;
revoke all on function private.record_estimate_event(uuid,uuid,uuid,uuid,integer,text,text),public.record_estimate_event(uuid,uuid,uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.record_estimate_event(uuid,uuid,uuid,uuid,integer,text,text),public.record_estimate_event(uuid,uuid,uuid,uuid,integer,text,text) to authenticated;

create table public.project_sketches(
 organization_id uuid not null,
 project_id uuid not null,
 id uuid not null default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 1 and 120),
 revision integer not null default 0 check(revision>=0),
 current_save_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,project_id,id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id)
);
create table public.sketch_saves(
 organization_id uuid not null,
 project_id uuid not null,
 sketch_id uuid not null,
 id uuid not null,
 base_revision integer not null check(base_revision>=0),
 revision integer check(revision=base_revision+1),
 title text not null check(length(btrim(title)) between 1 and 120),
 editor text not null default 'excalidraw' check(editor='excalidraw'),
 format_version integer not null default 2 check(format_version=2),
 scene_bytes integer not null check(scene_bytes between 1 and 8388608),
 preview_bytes integer not null check(preview_bytes between 1 and 1048576),
 scene_hash text not null check(scene_hash ~ '^[a-f0-9]{64}$'),
 preview_hash text not null check(preview_hash ~ '^[a-f0-9]{64}$'),
 scene_key text generated always as(organization_id::text||'/'||project_id::text||'/'||sketch_id::text||'/'||id::text||'/scene.json') stored,
 preview_key text generated always as(organization_id::text||'/'||project_id::text||'/'||sketch_id::text||'/'||id::text||'/preview.png') stored,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 committed_at timestamptz,
 primary key(organization_id,id),
 unique(organization_id,sketch_id,id),
 unique(organization_id,sketch_id,revision),
 unique(scene_key),unique(preview_key),
 foreign key(organization_id,project_id,sketch_id) references public.project_sketches(organization_id,project_id,id)
);
alter table public.project_sketches add constraint sketch_current_save_fk foreign key(organization_id,id,current_save_id) references public.sketch_saves(organization_id,sketch_id,id);
create index sketches_project_idx on public.project_sketches(organization_id,project_id,updated_at desc,id);
create index sketch_saves_project_idx on public.sketch_saves(organization_id,project_id,sketch_id,revision desc);
alter table public.project_sketches enable row level security;
alter table public.sketch_saves enable row level security;
revoke all on public.project_sketches,public.sketch_saves from anon,authenticated;
grant select on public.project_sketches,public.sketch_saves to authenticated;
grant insert(organization_id,project_id,id,title) on public.project_sketches to authenticated;
grant insert(organization_id,project_id,sketch_id,id,base_revision,title,scene_bytes,preview_bytes,scene_hash,preview_hash) on public.sketch_saves to authenticated;
create policy sketches_read on public.project_sketches for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));
create policy sketches_create on public.project_sketches for insert to authenticated with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy sketch_saves_read on public.sketch_saves for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and (role='owner' or sketch_saves.committed_at is not null)));
create policy sketch_saves_create on public.sketch_saves for insert to authenticated with check(created_by=(select auth.uid()) and organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('project-sketches','project-sketches',false,8388608,array['application/json','image/png']);
-- Uploads hold a lock so publication cannot race an unfinished Storage transaction.
create function private.can_upload_sketch(p_path text) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.sketch_saves;
begin
 if auth.uid() is null then return false; end if;
 select * into s from public.sketch_saves where scene_key=p_path or preview_key=p_path for share;
 return found and s.committed_at is null and exists(select 1 from public.organization_memberships m where m.organization_id=s.organization_id and m.user_id=auth.uid() and m.role='owner');
end $$;
revoke all on function private.can_upload_sketch(text) from public,anon,authenticated;
grant execute on function private.can_upload_sketch(text) to authenticated;
create policy sketch_objects_read on storage.objects for select to authenticated using(bucket_id='project-sketches' and exists(select 1 from public.sketch_saves s where s.scene_key=name or s.preview_key=name));
create policy sketch_objects_create on storage.objects for insert to authenticated with check(bucket_id='project-sketches' and private.can_upload_sketch(name));
-- No object update/delete or metadata mutation grants: saved revisions are immutable.
create function private.publish_sketch(p_org uuid,p_sketch uuid,p_save uuid) returns integer language plpgsql security definer set search_path='' as $$
declare sk public.project_sketches; s public.sketch_saves;
begin
 if auth.uid() is null or not exists(select 1 from public.organization_memberships where organization_id=p_org and user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501'; end if;
 select * into sk from public.project_sketches where organization_id=p_org and id=p_sketch for update;
 if not found then raise exception 'Sketch unavailable' using errcode='42501'; end if;
 select * into s from public.sketch_saves where organization_id=p_org and sketch_id=p_sketch and id=p_save for update;
 if not found then raise exception 'Save unavailable' using errcode='42501'; end if;
 if s.committed_at is not null then return s.revision; end if;
 if sk.revision<>s.base_revision then raise exception 'Sketch changed' using errcode='40001'; end if;
 if not exists(select 1 from storage.objects where bucket_id='project-sketches' and name=s.scene_key and metadata->>'mimetype'='application/json' and (metadata->>'size')::bigint=s.scene_bytes)
 or not exists(select 1 from storage.objects where bucket_id='project-sketches' and name=s.preview_key and metadata->>'mimetype'='image/png' and (metadata->>'size')::bigint=s.preview_bytes) then raise exception 'Upload incomplete' using errcode='22023'; end if;
 update public.sketch_saves set revision=base_revision+1,committed_at=now() where organization_id=p_org and id=p_save;
 update public.project_sketches set title=s.title,revision=s.base_revision+1,current_save_id=s.id,updated_at=now() where organization_id=p_org and id=p_sketch;
 return s.base_revision+1;
end $$;
create function public.publish_sketch(p_org uuid,p_sketch uuid,p_save uuid) returns integer language sql security invoker set search_path='' as $$select private.publish_sketch(p_org,p_sketch,p_save)$$;
revoke all on function private.publish_sketch(uuid,uuid,uuid),public.publish_sketch(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.publish_sketch(uuid,uuid,uuid),public.publish_sketch(uuid,uuid,uuid) to authenticated;

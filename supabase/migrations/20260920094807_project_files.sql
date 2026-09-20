insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-files','project-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
create table public.project_files(
 organization_id uuid not null,
 project_id uuid not null,
 id uuid not null default gen_random_uuid(),
 original_name text not null check(char_length(original_name) between 1 and 255),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 version integer not null default 1 check(version=1),
 object_key text generated always as (organization_id::text||'/'||project_id::text||'/'||id::text) stored,
 uploaded_by uuid not null default auth.uid() references auth.users(id),
 state text not null default 'pending' check(state in ('pending','ready','deleting','deleted')),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(object_key),
 foreign key(organization_id,project_id) references public.projects(organization_id,id)
);
create index project_files_project_idx on public.project_files(organization_id,project_id,created_at desc,id);
create index project_files_uploader_idx on public.project_files(uploaded_by);
alter table public.project_files enable row level security;
revoke all on public.project_files from anon,authenticated;
grant select on public.project_files to authenticated;
grant insert(organization_id,project_id,id,original_name,mime_type,size_bytes) on public.project_files to authenticated;
grant update(state) on public.project_files to authenticated;
create policy project_files_read on public.project_files for select to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid())));
create policy project_files_create on public.project_files for insert to authenticated with check(uploaded_by=(select auth.uid()) and organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create policy project_files_update on public.project_files for update to authenticated using(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner')) with check(organization_id in(select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create function private.can_upload_project_file(path text) returns boolean language plpgsql security invoker set search_path='' as $$
declare file public.project_files;
begin
 select * into file from public.project_files where object_key=path for share;
 return found and file.state='pending' and exists(select 1 from public.organization_memberships where organization_id=file.organization_id and user_id=(select auth.uid()) and role='owner');
end;
$$;
revoke all on function private.can_upload_project_file(text) from public,anon;
grant execute on function private.can_upload_project_file(text) to authenticated;
create policy project_objects_read on storage.objects for select to authenticated using(bucket_id='project-files' and exists(select 1 from public.project_files f where f.object_key=name));
create policy project_objects_create on storage.objects for insert to authenticated with check(bucket_id='project-files' and private.can_upload_project_file(name));
create policy project_objects_delete on storage.objects for delete to authenticated using(bucket_id='project-files' and exists(select 1 from public.project_files f join public.organization_memberships m on m.organization_id=f.organization_id where f.object_key=name and f.state='deleting' and m.user_id=(select auth.uid()) and m.role='owner'));
create function private.validate_project_file_state() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state=old.state then return new; end if;
 if old.state='pending' and new.state='ready' then
  if not exists(select 1 from storage.objects where bucket_id='project-files' and name=old.object_key and (metadata->>'size')::bigint=old.size_bytes and metadata->>'mimetype'=old.mime_type) then raise exception 'Upload not confirmed' using errcode='22023'; end if;
 elsif old.state in ('pending','ready') and new.state='deleting' then null;
 elsif old.state='deleting' and new.state='deleted' then
  if exists(select 1 from storage.objects where bucket_id='project-files' and name=old.object_key) then raise exception 'Object still exists' using errcode='22023'; end if;
 else raise exception 'Invalid file state transition' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_project_file_state() from public,anon,authenticated;
create trigger project_file_state before update on public.project_files for each row execute function private.validate_project_file_state();

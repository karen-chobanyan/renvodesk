-- Rollback-only quota fixture. Never use production/customer rows.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('71111111-1111-4111-8111-111111111111','quota-owner@example.test',now(),false),
 ('72222222-2222-4222-8222-222222222222','quota-member@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('quota.org1',public.create_organization('Quota A','BE',gen_random_uuid())::text,true);
select set_config('quota.org2',public.create_organization('Quota B','FR',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values
 (current_setting('quota.org1')::uuid,'71111111-1111-4111-8111-111111111112','A','Client','City'),
 (current_setting('quota.org2')::uuid,'71111111-1111-4111-8111-111111111113','B','Client','City');
reset role;
update private.account_storage_quota set limit_bytes=400
 where account_id='71111111-1111-4111-8111-111111111111';
update private.workspace_storage_quota set limit_bytes=200
 where organization_id in(current_setting('quota.org1')::uuid,current_setting('quota.org2')::uuid);
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes) values
 (current_setting('quota.org1')::uuid,'71111111-1111-4111-8111-111111111112',
  '71111111-1111-4111-8111-111111111114','a.pdf','application/pdf',100),
 (current_setting('quota.org2')::uuid,'71111111-1111-4111-8111-111111111113',
  '71111111-1111-4111-8111-111111111115','b.pdf','application/pdf',100);
do $$ begin
 if (select account_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>200 then
  raise exception 'Cross-workspace account reservation missing'; end if;
 if (select workspace_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>100 then
  raise exception 'Workspace reservation missing'; end if;
 begin
  insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes)
   values(current_setting('quota.org1')::uuid,'71111111-1111-4111-8111-111111111112',
   gen_random_uuid(),'over.pdf','application/pdf',101);
  raise exception 'Workspace overage accepted';
 exception when sqlstate 'PZ102' then null; end;
 if (select account_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>200 then
  raise exception 'Failed insert changed account counter'; end if;
end $$;
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes)
 values(current_setting('quota.org1')::uuid,'71111111-1111-4111-8111-111111111112',
 '71111111-1111-4111-8111-111111111116','exact.pdf','application/pdf',100);
do $$ begin
 if (select workspace_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>200 then
  raise exception 'Exact workspace boundary failed'; end if;
 begin
  insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes)
   values(current_setting('quota.org2')::uuid,'71111111-1111-4111-8111-111111111113',
   gen_random_uuid(),'account.pdf','application/pdf',101);
  raise exception 'Account overage accepted';
 exception when sqlstate 'PZ101' then null; end;
 begin
  insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes)
   values(current_setting('quota.org1')::uuid,'71111111-1111-4111-8111-111111111112',
   '71111111-1111-4111-8111-111111111114','duplicate.pdf','application/pdf',100);
  raise exception 'Duplicate key accepted';
 exception when unique_violation then null; end;
end $$;
select set_config('quota.file_key',(
 select object_key from public.project_files
 where id='71111111-1111-4111-8111-111111111114'),true);
do $$ begin
 if not private.can_upload_project_file(current_setting('quota.file_key'),
  '{"mimetype":"application/pdf"}') then raise exception 'Upload preflight rejected'; end if;
 if private.can_upload_project_file(current_setting('quota.file_key'),
  '{"mimetype":"application/pdf","size":101}') then
  raise exception 'Wrong file size accepted'; end if;
 begin
  insert into storage.objects(bucket_id,name,metadata) values
   ('project-files',current_setting('quota.file_key'),
    '{"mimetype":"application/pdf","size":101}');
  raise exception 'Storage RLS accepted wrong size';
 exception when insufficient_privilege then null; end;
end $$;
insert into storage.objects(bucket_id,name,metadata) values
 ('project-files',current_setting('quota.file_key'),
  '{"mimetype":"application/pdf","size":100}');
update public.project_files set state='ready'
 where id='71111111-1111-4111-8111-111111111114';
do $$ begin
 if (select account_used_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>100 then
  raise exception 'Finalize did not move reserved to used'; end if;
end $$;
-- A committed object must be removed through the Storage API. This SQL fixture
-- tests cancellation of a metadata reservation that never received an object.
update public.project_files set state='deleting'
 where id='71111111-1111-4111-8111-111111111116';
update public.project_files set state='deleted'
 where id='71111111-1111-4111-8111-111111111116';
do $$ begin
 if (select account_used_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>100 then
  raise exception 'Pending deletion changed used bytes'; end if;
 if (select account_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org1')::uuid))<>100 then
  raise exception 'Pending deletion did not release its reservation'; end if;
end $$;
insert into public.project_sketches(organization_id,project_id,id,title)
 values(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111113',
 '71111111-1111-4111-8111-111111111117','Sketch');
insert into public.sketch_saves(organization_id,project_id,sketch_id,id,
 base_revision,title,scene_bytes,preview_bytes,scene_hash,preview_hash)
 values(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111113',
 '71111111-1111-4111-8111-111111111117',
 '71111111-1111-4111-8111-111111111118',0,'Sketch',50,50,
 repeat('a',64),repeat('b',64));
do $$ begin
 if (select account_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org2')::uuid))<>200 then
  raise exception 'File and sketch reservations not combined'; end if;
 if private.can_upload_sketch((select scene_key from public.sketch_saves
  where id='71111111-1111-4111-8111-111111111118'),
  '{"mimetype":"application/json","size":51}') then
  raise exception 'Wrong scene size accepted'; end if;
end $$;
select public.cancel_sketch_save(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111118');
select public.finalize_sketch_cancellation(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111118');
select public.finalize_sketch_cancellation(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111118');
do $$ begin
 if (select account_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org2')::uuid))<>100 then
  raise exception 'Sketch cancellation did not release once'; end if;
 begin
  perform public.publish_sketch(current_setting('quota.org2')::uuid,
   '71111111-1111-4111-8111-111111111117',
   '71111111-1111-4111-8111-111111111118');
  raise exception 'Canceled sketch published';
 exception when insufficient_privilege then null; end;
end $$;
insert into public.sketch_saves(organization_id,project_id,sketch_id,id,
 base_revision,title,scene_bytes,preview_bytes,scene_hash,preview_hash)
 values(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111113',
 '71111111-1111-4111-8111-111111111117',
 '71111111-1111-4111-8111-111111111119',0,'Published',50,50,
 repeat('c',64),repeat('d',64));
insert into storage.objects(bucket_id,name,metadata)
 select 'project-sketches',scene_key,
  '{"mimetype":"application/json","size":50}'::jsonb
 from public.sketch_saves where id='71111111-1111-4111-8111-111111111119';
insert into storage.objects(bucket_id,name,metadata)
 select 'project-sketches',preview_key,
  '{"mimetype":"image/png","size":50}'::jsonb
 from public.sketch_saves where id='71111111-1111-4111-8111-111111111119';
select public.publish_sketch(current_setting('quota.org2')::uuid,
 '71111111-1111-4111-8111-111111111117',
 '71111111-1111-4111-8111-111111111119');
do $$ begin
 if (select account_used_bytes from public.read_storage_usage(
  current_setting('quota.org2')::uuid))<>200 or
  (select account_reserved_bytes from public.read_storage_usage(
  current_setting('quota.org2')::uuid))<>100 then
  raise exception 'Sketch publication did not move reserved to used'; end if;
end $$;
reset role;
insert into public.organization_memberships(organization_id,user_id,role)
 values(current_setting('quota.org1')::uuid,
 '72222222-2222-4222-8222-222222222222','member');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"72222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 begin perform * from public.read_storage_usage(current_setting('quota.org1')::uuid);
  raise exception 'Member read quota';
 exception when insufficient_privilege then null; end;
 begin update private.account_storage_quota set limit_bytes=900;
  raise exception 'Member changed quota';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: nested quota boundaries, retries, Storage RLS size, lifecycle, cancellation and member isolation' as result;
rollback;

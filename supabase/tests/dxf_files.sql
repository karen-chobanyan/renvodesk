-- Rollback-only synthetic DXF reservations and authorization checks.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','dxf-owner@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','dxf-member@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','dxf-outsider@example.test',now(),false);
do $$ begin
 if not exists(select 1 from storage.buckets where id='project-files' and not public and file_size_limit=10485760 and 'application/dxf'=any(allowed_mime_types)) then raise exception 'DXF bucket configuration'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org', public.create_organization('DXF fixture','BE','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','DXF project','Fixture','Brussels');
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Plan.dxf','application/dxf',100);
select set_config('test.key',(select object_key from public.project_files where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'),true);
do $$ begin
 begin insert into public.project_files(organization_id,project_id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Big.dxf','application/dxf',10485761); raise exception 'Oversize accepted'; exception when check_violation then null; end;
 begin insert into public.project_files(organization_id,project_id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Plan.dwg','application/acad',100); raise exception 'DWG accepted'; exception when check_violation then null; end;
 begin insert into public.project_files(organization_id,project_id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Plan.dxf','application/dxf',100); raise exception 'Invalid project accepted'; exception when foreign_key_violation then null; end;
 begin update public.project_files set state='ready'; raise exception 'Missing upload accepted'; exception when invalid_parameter_value then null; end;
end $$;
-- Synthetic Storage metadata is only for policy tests, not an actual uploaded object.
insert into storage.objects(bucket_id,name,metadata) values('project-files',current_setting('test.key'),'{"size":100,"mimetype":"application/dxf"}');
update public.project_files set state='ready';
do $$ begin
 if private.can_upload_project_file(current_setting('test.key')) then raise exception 'Overwrite allowed'; end if;
 begin update public.project_files set mime_type='text/plain'; raise exception 'MIME mutable'; exception when insufficient_privilege then null; end;
end $$;
do $$
declare bad_id uuid; bad_key text; wrong jsonb;
begin
 foreach wrong in array array['{"size":99,"mimetype":"application/dxf"}'::jsonb,'{"size":100,"mimetype":"text/plain"}'::jsonb] loop
  bad_id := gen_random_uuid();
  insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc',bad_id,'Mismatch.dxf','application/dxf',100) returning object_key into bad_key;
  insert into storage.objects(bucket_id,name,metadata) values('project-files',bad_key,wrong);
  begin update public.project_files set state='ready' where id=bad_id; raise exception 'Mismatched object finalized'; exception when invalid_parameter_value then null; end;
 end loop;
end $$;
reset role;
insert into public.organization_memberships(organization_id,user_id,role) values(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222','member');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.project_files where object_key=current_setting('test.key')) then raise exception 'Member cannot read metadata'; end if;
 if not exists(select 1 from storage.objects where name=current_setting('test.key')) then raise exception 'Member cannot read object'; end if;
 if private.can_upload_project_file(current_setting('test.key')) then raise exception 'Member can upload'; end if;
 begin insert into public.project_files(organization_id,project_id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Member.dxf','application/dxf',100); raise exception 'Member reservation allowed'; exception when insufficient_privilege then null; end;
 update public.project_files set state='deleting'; if found then raise exception 'Member deletion allowed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.project_files where object_key=current_setting('test.key')) or exists(select 1 from storage.objects where name=current_setting('test.key')) then raise exception 'Cross-tenant leak'; end if;
 if private.can_upload_project_file(current_setting('test.key')) then raise exception 'Outsider upload'; end if;
 update public.project_files set state='deleting'; if found then raise exception 'Outsider deletion'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
update public.project_files set state='deleting';
do $$ begin
 if not exists(select 1 from public.project_files where object_key=current_setting('test.key') and state='deleting') then raise exception 'Owner deletion unavailable'; end if;
 begin update public.project_files set state='deleted'; raise exception 'Dangling object allowed'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
select 'PASS: DXF bucket, owner upload lifecycle, member read-only, outsider isolation, size/type/project validation, immutable MIME and keys' as result;
rollback;

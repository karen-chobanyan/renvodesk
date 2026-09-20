begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','sketch-owner@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','sketch-member@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','sketch-outsider@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org',public.create_organization('Sketch fixture','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Site','Client','City');
insert into public.project_sketches(organization_id,project_id,id,title) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Plan');
insert into public.sketch_saves(organization_id,project_id,sketch_id,id,base_revision,title,scene_bytes,preview_bytes,scene_hash,preview_hash) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc',0,'Plan',100,100,repeat('a',64),repeat('b',64)),(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd',0,'Conflicting plan',100,100,repeat('c',64),repeat('d',64));
do $$ begin
 begin perform public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc'); raise exception 'Published without uploads'; exception when invalid_parameter_value then null; end;
 begin update public.project_sketches set revision=99 where organization_id=current_setting('test.org')::uuid; raise exception 'Direct revision edit'; exception when insufficient_privilege then null; end;
 begin update public.sketch_saves set committed_at=now() where organization_id=current_setting('test.org')::uuid; raise exception 'History mutation'; exception when insufficient_privilege then null; end;
end $$;
insert into storage.objects(bucket_id,name,metadata) select 'project-sketches',scene_key,'{"size":100,"mimetype":"application/json"}'::jsonb from public.sketch_saves;
do $$ begin begin perform public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc'); raise exception 'Published without preview'; exception when invalid_parameter_value then null; end; end $$;
insert into storage.objects(bucket_id,name,metadata) select 'project-sketches',preview_key,'{"size":100,"mimetype":"image/png"}'::jsonb from public.sketch_saves;
select public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
do $$ begin
 if not exists(select 1 from public.project_sketches where revision=1 and current_save_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') then raise exception 'Publish failed'; end if;
 begin perform public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd'); raise exception 'Stale publication succeeded'; exception when serialization_failure then null; end;
 if private.can_upload_sketch((select scene_key from public.sketch_saves where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')) then raise exception 'Published revision upload allowed'; end if;
 begin delete from storage.objects where bucket_id='project-sketches' and name in(select scene_key from public.sketch_saves where organization_id=current_setting('test.org')::uuid); if found then raise exception 'Immutable objects deleted'; end if; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.organization_memberships(organization_id,user_id,role) values(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222','member');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.project_sketches)<>1 or (select count(*) from public.sketch_saves)<>1 then raise exception 'Member read isolation failed'; end if;
 if (select count(*) from storage.objects where bucket_id='project-sketches')<>2 then raise exception 'Member objects visibility failed'; end if;
 begin perform public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd'); raise exception 'Member published'; exception when insufficient_privilege then null; end;
 begin insert into public.project_sketches(organization_id,project_id,title) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Attack'); raise exception 'Member created sketch'; exception when insufficient_privilege then null; end;
 if private.can_upload_sketch((select scene_key from public.sketch_saves limit 1)) then raise exception 'Member upload'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
select set_config('test.other',public.create_organization('Other fixture','FR',gen_random_uuid())::text,true);
do $$ begin
 if exists(select 1 from public.project_sketches) or exists(select 1 from public.sketch_saves) or exists(select 1 from storage.objects where bucket_id='project-sketches') then raise exception 'Cross-company read'; end if;
 begin insert into public.project_sketches(organization_id,project_id,title) values(current_setting('test.other')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Attack'); raise exception 'Cross-company link'; exception when foreign_key_violation then null; end;
 begin perform public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc'); raise exception 'Cross-company publish'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin begin perform public.publish_sketch(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc'); raise exception 'Anonymous publish'; exception when insufficient_privilege then null; end; end $$;
reset role;
select 'PASS: sketch publication, missing uploads, retries, conflicts, immutable history and owner/member/tenant isolation' as result;
rollback;

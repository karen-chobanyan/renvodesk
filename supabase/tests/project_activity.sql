begin;
create function pg_temp.check_activity(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',message; end if; end $$;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','activity-owner@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','activity-member@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','activity-other@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org',public.create_organization('Activity fixture','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Site','Client','City');
update public.projects set revision=revision+1 where organization_id=current_setting('test.org')::uuid;
select pg_temp.check_activity((select count(*)=1 from public.project_activity),'No-op must not emit');
update public.projects set name='Renamed',status='active',revision=revision+1 where organization_id=current_setting('test.org')::uuid;
select pg_temp.check_activity((select count(*)=2 from public.project_activity),'Multi-field edit must emit once');
select pg_temp.check_activity((select payload->>'from_status'='planning' and payload->>'to_status'='active' from public.project_activity where event_type='project.updated'),'Status history');
do $$ begin
 begin update public.projects set name='Stale',revision=3 where organization_id=current_setting('test.org')::uuid; raise exception 'Stale accepted'; exception when serialization_failure then null; end;
 begin insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Retry','Client','City'); raise exception 'Duplicate accepted'; exception when unique_violation then null; end;
 begin insert into public.project_activity(organization_id,project_id,actor_user_id,event_type,category,visibility,entity_type,entity_id,source_key,payload) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'project.created','project','member','project',gen_random_uuid(),'spoof','{}'); raise exception 'Direct append'; exception when insufficient_privilege then null; end;
 begin update public.project_activity set visibility='member'; raise exception 'Direct update'; exception when insufficient_privilege then null; end;
 begin delete from public.project_activity; raise exception 'Direct delete'; exception when insufficient_privilege then null; end;
 begin perform private.capture_project_activity(); raise exception 'Private append callable'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check_activity((select count(*)=2 from public.project_activity),'Failed saves emitted');
reset role;
insert into public.organization_memberships(organization_id,user_id,role) values(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222','member');
set local role authenticated;
insert into public.project_tasks(organization_id,project_id,id,title,assignee_id) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Task','22222222-2222-4222-8222-222222222222');
insert into public.project_budgets(organization_id,project_id,budget_cents) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',50000);
update public.project_budgets set budget_cents=60000,revision=2 where organization_id=current_setting('test.org')::uuid;
insert into public.project_costs(organization_id,project_id,id,description,category,amount_cents,incurred_on) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Materials','materials',24500,'2026-09-22');
update public.project_costs set amount_cents=24000,revision=2 where organization_id=current_setting('test.org')::uuid;
update public.project_costs set voided=true,revision=3 where organization_id=current_setting('test.org')::uuid;
insert into public.estimates(organization_id,project_id,id,title) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Quote');
update public.estimates set lines='[{"id":"line","description":"Work","quantity":"2","price":"12.34","unit":"fixed"}]',revision=2 where organization_id=current_setting('test.org')::uuid;
select public.record_estimate_event(current_setting('test.org')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',2,'sent','Reference not copied to feed');
select public.record_estimate_event(current_setting('test.org')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',2,'sent','Reference not copied to feed');
select public.record_estimate_event(current_setting('test.org')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ffffffff-ffff-4fff-8fff-ffffffffffff',3,'accepted','Phone reference');
select pg_temp.check_activity((select count(*)=4 from public.project_activity where category='estimates'),'Estimate duplicated or missing');
select pg_temp.check_activity(not exists(select 1 from public.project_activity where payload ?| array['notes','note','lines','email','address','object_key']),'Sensitive payload copied');
select pg_temp.check_activity((select jsonb_typeof(payload->'amount_cents')='string' and payload->>'amount_cents'='2468' from public.project_activity where event_type='estimate.updated'),'Exact cents');
-- File upload finalization records only ready files, once.
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','12345678-1234-4234-8234-123456789012','Photo.jpg','image/jpeg',100);
do $$ begin
 begin update public.project_files set state='ready' where organization_id=current_setting('test.org')::uuid; raise exception 'Incomplete upload accepted'; exception when invalid_parameter_value then null; end;
 begin update public.project_files set activity_was_ready=true; raise exception 'Ready provenance spoof'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check_activity(not exists(select 1 from public.project_activity where entity_type='file'),'Pending upload leaked');
insert into storage.objects(bucket_id,name,metadata) select 'project-files',object_key,'{"size":100,"mimetype":"image/jpeg"}'::jsonb from public.project_files where organization_id=current_setting('test.org')::uuid;
update public.project_files set state='ready' where organization_id=current_setting('test.org')::uuid;
update public.project_files set state='ready' where organization_id=current_setting('test.org')::uuid;
select pg_temp.check_activity((select count(*)=1 from public.project_activity where event_type='file.added'),'File ready retry');
-- Synthetic already-removed object: no storage.objects deletion is performed.
reset role;
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes,state,activity_was_ready,uploaded_by) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','12345678-1234-4234-8234-123456789013','Deleted.jpg','image/jpeg',100,'deleting',true,'11111111-1111-4111-8111-111111111111');
set local role authenticated;
update public.project_files set state='deleted' where id='12345678-1234-4234-8234-123456789013';
update public.project_files set state='deleted' where id='12345678-1234-4234-8234-123456789013';
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','12345678-1234-4234-8234-123456789014','Cancelled.jpg','image/jpeg',100);
update public.project_files set state='deleting' where id='12345678-1234-4234-8234-123456789014';
update public.project_files set state='deleted' where id='12345678-1234-4234-8234-123456789014';
select pg_temp.check_activity((select count(*)=1 from public.project_activity where event_type='file.deleted'),'Cancellation or retry logged as deletion');
insert into public.project_sketches(organization_id,project_id,id,title) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','12345678-1234-4234-8234-123456789015','Plan');
insert into public.sketch_saves(organization_id,project_id,sketch_id,id,base_revision,title,scene_bytes,preview_bytes,scene_hash,preview_hash) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','12345678-1234-4234-8234-123456789015','12345678-1234-4234-8234-123456789016',0,'Plan',100,100,repeat('a',64),repeat('b',64));
do $$ begin begin perform public.publish_sketch(current_setting('test.org')::uuid,'12345678-1234-4234-8234-123456789015','12345678-1234-4234-8234-123456789016'); raise exception 'Incomplete save published'; exception when invalid_parameter_value then null; end; end $$;
select pg_temp.check_activity((select count(*)=1 from public.project_activity where entity_type='sketch'),'Pending sketch leaked');
insert into storage.objects(bucket_id,name,metadata) select 'project-sketches',scene_key,'{"size":100,"mimetype":"application/json"}'::jsonb from public.sketch_saves where organization_id=current_setting('test.org')::uuid;
insert into storage.objects(bucket_id,name,metadata) select 'project-sketches',preview_key,'{"size":100,"mimetype":"image/png"}'::jsonb from public.sketch_saves where organization_id=current_setting('test.org')::uuid;
select public.publish_sketch(current_setting('test.org')::uuid,'12345678-1234-4234-8234-123456789015','12345678-1234-4234-8234-123456789016');
select public.publish_sketch(current_setting('test.org')::uuid,'12345678-1234-4234-8234-123456789015','12345678-1234-4234-8234-123456789016');
select pg_temp.check_activity((select count(*)=1 from public.project_activity where event_type='sketch.published'),'Sketch publish retry');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
update public.project_tasks set status='done',revision=2 where organization_id=current_setting('test.org')::uuid;
select pg_temp.check_activity((select actor_user_id=auth.uid() and payload->>'to_status'='done' from public.project_activity where event_type='task.updated'),'Assigned-member actor');
select pg_temp.check_activity(not exists(select 1 from public.project_activity where visibility='owner' or category in ('estimates','costs')),'Financial leak to member');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select public.team_remove(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222');
select pg_temp.check_activity(exists(select 1 from public.project_activity where event_type='task.updated' and actor_user_id=auth.uid() and payload->'changed_fields' ? 'assignee_id'),'Indirect unassignment');
delete from public.project_tasks where organization_id=current_setting('test.org')::uuid and revision=2;
select pg_temp.check_activity(not exists(select 1 from public.project_activity where event_type='task.deleted'),'Stale delete logged');
delete from public.project_tasks where organization_id=current_setting('test.org')::uuid and revision=3;
select pg_temp.check_activity(exists(select 1 from public.project_activity where event_type='task.deleted' and payload->>'label'='Task'),'Deleted task history');
-- Same timestamp tie-break preserves every row across pages.
select pg_temp.check_activity((with head as (select occurred_at,id from public.project_activity order by occurred_at desc,id desc limit 5), cursor as(select * from head order by occurred_at,id limit 1), tail as(select a.id from public.project_activity a,cursor c where (a.occurred_at,a.id)<(c.occurred_at,c.id)) select (select count(*) from head)+(select count(*) from tail)=(select count(*) from public.project_activity)),'Cursor lost tied rows');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select pg_temp.check_activity(not exists(select 1 from public.project_activity),'Removed member retained access');
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
select set_config('test.other',public.create_organization('Other activity fixture','FR',gen_random_uuid())::text,true);
select pg_temp.check_activity(not exists(select 1 from public.project_activity),'Cross-company read');
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.other')::uuid,'12345678-1234-4234-8234-123456789017','Other','Client','City');
select pg_temp.check_activity((select count(*)=1 from public.project_activity),'Other company events');
reset role;
do $$ begin
 begin insert into public.project_activity(organization_id,project_id,actor_user_id,event_type,category,visibility,entity_type,entity_id,source_key,payload) values(current_setting('test.other')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','project.created','project','member','project',gen_random_uuid(),'wrong-project','{}'); raise exception 'Cross-company FK'; exception when foreign_key_violation then null; end;
end $$;
-- A failed journal insert must roll back the originating source mutation.
alter table public.project_activity add constraint test_activity_reject check(event_type<>'project.updated') not valid;
set local role authenticated;
do $$ begin
 begin update public.projects set name='Must roll back',revision=revision+1 where organization_id=current_setting('test.other')::uuid; raise exception 'Journal failure swallowed'; exception when check_violation then null; end;
end $$;
select pg_temp.check_activity((select name='Other' and revision=1 from public.projects where organization_id=current_setting('test.other')::uuid),'Journal failure did not roll back source');
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin begin perform * from public.project_activity; raise exception 'Anonymous read'; exception when insufficient_privilege then null; end; end $$;
reset role;
select 'PASS: activity capture, RLS, retry/no-op/conflict behavior, file/sketch boundaries, exact payloads, deleted history, keysets and atomic rollback' as result;
rollback;

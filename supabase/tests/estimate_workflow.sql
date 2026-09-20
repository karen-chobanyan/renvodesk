begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','workflow-owner@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','workflow-member@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','workflow-outsider@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org',public.create_organization('Workflow fixture','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Original site','Client','City');
insert into public.estimates(organization_id,id,project_id,title) values(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Quote');
do $$ begin
 begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,'sent','Email reference');raise exception 'Empty allowed';exception when invalid_parameter_value then null;end;
 begin update public.estimates set status='accepted' where organization_id=current_setting('test.org')::uuid;raise exception 'Direct status allowed';exception when insufficient_privilege then null;end;
end $$;
update public.estimates set lines='[{"id":"line","description":"Renovation","quantity":"2","price":"12.34","unit":"fixed"}]',revision=2 where organization_id=current_setting('test.org')::uuid;
select public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',2,'sent','Email reference');
select public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',2,'sent','Email reference');
update public.projects set name='Changed site',revision=revision+1 where organization_id=current_setting('test.org')::uuid;
do $$ begin
 if not exists(select 1 from public.estimates where organization_id=current_setting('test.org')::uuid and status='sent' and revision=3 and total_cents=2468 and sent_snapshot->'project'->>'name'='Original site') then raise exception 'Snapshot or retry failed';end if;
 begin update public.estimates set title='Rewrite',revision=4 where organization_id=current_setting('test.org')::uuid;raise exception 'Sent title changed';exception when invalid_parameter_value then null;end;
 begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',2,'accepted','Telephone reference');raise exception 'Stale accepted';exception when serialization_failure then null;end;
 begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',2,'sent','Changed note');raise exception 'Retry changed';exception when invalid_parameter_value then null;end;
end $$;
select public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',3,'accepted','Telephone reference');
do $$ begin
 if (select count(*) from public.estimate_events where organization_id=current_setting('test.org')::uuid)<>2 then raise exception 'Duplicate events';end if;
 begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',4,'declined','Changed decision');raise exception 'Terminal changed';exception when invalid_parameter_value then null;end;
 begin delete from public.estimate_events where organization_id=current_setting('test.org')::uuid;raise exception 'Audit deleted';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into public.organization_memberships(organization_id,user_id,role) values(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222','member');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.estimate_events) or exists(select 1 from public.estimates) then raise exception 'Member financial access';end if;
 begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',4,'declined','Attack');raise exception 'Member transition';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.estimate_events) then raise exception 'Outsider history';end if;
 begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',4,'declined','Attack');raise exception 'Outsider transition';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin begin perform public.record_estimate_event(current_setting('test.org')::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',4,'declined','Attack');raise exception 'Anonymous transition';exception when insufficient_privilege then null;end;end $$;
reset role;
select 'PASS: immutable sent snapshots, exact totals, transition retries/conflicts, terminal lock, audit and owner-only isolation' as result;
rollback;

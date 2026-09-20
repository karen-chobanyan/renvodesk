begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','task-a@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','task-b@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org_a',public.create_organization('Tasks A','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Site A','Client','Brussels');
insert into public.project_tasks(organization_id,project_id,id,title,start_date,due_date) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Plumbing','2026-09-21','2026-09-23');
do $$ begin
 if (select count(*) from public.project_tasks)<>1 then raise exception 'Owner read failed'; end if;
 begin update public.project_tasks set status='invalid',revision=2; raise exception 'Invalid status accepted'; exception when check_violation then null; end;
 begin update public.project_tasks set due_date='2026-09-20',revision=2; raise exception 'Reversed dates accepted'; exception when check_violation then null; end;
 begin update public.project_tasks set start_date='1899-12-31',revision=2; raise exception 'Out of range date accepted'; exception when check_violation then null; end;
 begin update public.project_tasks set title=' ',revision=2; raise exception 'Blank title accepted'; exception when check_violation then null; end;
 begin update public.project_tasks set status='done'; raise exception 'Stale revision accepted'; exception when serialization_failure then null; end;
 begin update public.project_tasks set project_id=gen_random_uuid(),revision=2; raise exception 'Identity mutation allowed'; exception when insufficient_privilege then null; end;
 update public.project_tasks set status='in_progress',revision=2 where revision=1;
 if not exists(select 1 from public.project_tasks where revision=2 and status='in_progress') then raise exception 'Owner update failed'; end if;
 update public.project_tasks set title='stale',revision=2 where revision=1;
 if found then raise exception 'Stale write matched'; end if;
 delete from public.project_tasks where revision=1;
 if found then raise exception 'Stale delete matched'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select set_config('test.org_b',public.create_organization('Tasks B','FR',gen_random_uuid())::text,true);
do $$ begin
 if exists(select 1 from public.project_tasks) then raise exception 'Cross tenant read'; end if;
 update public.project_tasks set title='attack',revision=3;
 if found then raise exception 'Cross tenant update'; end if;
 delete from public.project_tasks;
 if found then raise exception 'Cross tenant delete'; end if;
 begin insert into public.project_tasks(organization_id,project_id,title) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Attack'); raise exception 'Cross tenant insert'; exception when insufficient_privilege then null; end;
 begin insert into public.project_tasks(organization_id,project_id,title) values(current_setting('test.org_b')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Wrong project'); raise exception 'Cross tenant FK allowed'; exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
delete from public.project_tasks where organization_id=current_setting('test.org_a')::uuid and revision=2;
do $$ begin if exists(select 1 from public.project_tasks) then raise exception 'Owner delete failed'; end if; end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.project_tasks; raise exception 'Anonymous read'; exception when insufficient_privilege then null; end;
 begin insert into public.project_tasks(organization_id,project_id,title) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Anonymous'); raise exception 'Anonymous insert'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: task CRUD, validation, revision conflicts, immutable identity, tenant isolation, composite FK and anonymous denial' as result;
rollback;

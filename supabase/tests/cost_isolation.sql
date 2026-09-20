begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','task-a@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','task-b@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org_a',public.create_organization('Tasks A','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Site A','Client','Brussels');

insert into public.project_budgets(organization_id,project_id,budget_cents) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc',10000);
insert into public.project_costs(organization_id,project_id,id,description,category,amount_cents,incurred_on) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Paint','materials',1234,'2026-09-20');
do $$ declare s record; begin
 select * into s from public.project_cost_summary(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 if s.total<>'1234' or s.materials<>'1234' or s.budget_cents<>10000 then raise exception 'Summary wrong'; end if;
 update public.project_budgets set budget_cents=20000,revision=2 where revision=1;
 if not found then raise exception 'Budget update failed'; end if;
 begin update public.project_budgets set budget_cents=-1,revision=3; raise exception 'Negative budget accepted'; exception when check_violation then null; end;
 begin update public.project_costs set amount_cents=0,revision=2; raise exception 'Zero cost accepted'; exception when check_violation then null; end;
 begin update public.project_costs set category='invalid',revision=2; raise exception 'Category accepted'; exception when check_violation then null; end;
 begin update public.project_costs set project_id=gen_random_uuid(); raise exception 'Identity changed'; exception when insufficient_privilege then null; end;
 begin update public.project_costs set description='stale'; raise exception 'Revision unchecked'; exception when serialization_failure then null; end;
 update public.project_costs set amount_cents=2345,revision=2 where revision=1;
 update public.project_costs set amount_cents=1,revision=2 where revision=1;
 if found then raise exception 'Stale update matched'; end if;
 update public.project_costs set voided=true,revision=3 where revision=2;
 select * into s from public.project_cost_summary(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 if s.total<>'0' or s.budget_cents<>20000 then raise exception 'Void totals wrong'; end if;
 if not exists(select 1 from public.project_costs where voided) then raise exception 'History lost'; end if;
 begin update public.project_costs set voided=false,revision=4; raise exception 'Void reversal allowed'; exception when invalid_parameter_value then null; end;
 begin delete from public.project_costs; raise exception 'Hard delete allowed'; exception when insufficient_privilege then null; end;
end $$;
insert into public.project_costs(organization_id,project_id,description,category,amount_cents,incurred_on)
select current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Labor '||n,'labor',29,'2026-09-20' from generate_series(1,25) n;
do $$ declare s record; begin
 select * into s from public.project_cost_summary(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 if s.total<>'725' or s.labor<>'725' or s.materials<>'0' then raise exception 'Totals across pages wrong'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select set_config('test.org_b',public.create_organization('Costs B','FR',gen_random_uuid())::text,true);
do $$ begin
 if exists(select 1 from public.project_costs) or exists(select 1 from public.project_budgets) then raise exception 'Cross tenant read'; end if;
 if exists(select 1 from public.project_cost_summary(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc')) then raise exception 'Summary leaked'; end if;
 update public.project_budgets set budget_cents=0,revision=3;
 if found then raise exception 'Cross tenant budget write'; end if;
 update public.project_costs set amount_cents=1,revision=4;
 if found then raise exception 'Cross tenant cost write'; end if;
 begin insert into public.project_costs(organization_id,project_id,description,category,amount_cents,incurred_on) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Attack','labor',1,'2026-09-20'); raise exception 'Cross tenant insert'; exception when insufficient_privilege then null; end;
 begin insert into public.project_costs(organization_id,project_id,description,category,amount_cents,incurred_on) values(current_setting('test.org_b')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Wrong link','labor',1,'2026-09-20'); raise exception 'Cross tenant project link'; exception when foreign_key_violation then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.project_costs; raise exception 'Anonymous read'; exception when insufficient_privilege then null; end;
 begin perform * from public.project_cost_summary(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'); raise exception 'Anonymous summary'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: exact totals, budget/cost revisions, validation, void history, immutable voids, tenant isolation, composite project links and anonymous denial' as result;
rollback;

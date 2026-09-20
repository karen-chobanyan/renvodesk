
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous)
values ('11111111-1111-4111-8111-111111111111','renvo-rls-a@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','renvo-rls-b@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','renvo-rls-unverified@example.test',null,false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org_a',public.create_organization('Test A','BE','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')::text,true);
do $$ begin
 if public.create_organization('Test A retry','BE','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')::text <> current_setting('test.org_a') then raise exception 'Idempotency failed'; end if;
 if (select count(*) from public.organizations) <> 1 then raise exception 'Own org read failed'; end if;
 begin insert into public.organization_memberships(organization_id,user_id) values(current_setting('test.org_a')::uuid,'22222222-2222-4222-8222-222222222222'); raise exception 'Direct membership insert allowed'; exception when insufficient_privilege then null; end;
 begin update public.organizations set name='unauthorized'; raise exception 'Direct update allowed'; exception when insufficient_privilege then null; end;
 begin perform public.create_organization(' ','BE',gen_random_uuid()); raise exception 'Blank name accepted'; exception when invalid_parameter_value then null; end;
end $$;
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Kitchen','Client','Brussels');
do $$ begin
 if (select count(*) from public.projects) <> 1 then raise exception 'Own project read failed'; end if;
 begin insert into public.projects(organization_id,name,client_name,city) values(current_setting('test.org_a')::uuid,' ','Client','City'); raise exception 'Blank project accepted'; exception when check_violation then null; end;
 begin update public.projects set organization_id=gen_random_uuid(); raise exception 'Project mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
do $$ declare affected integer; begin
 update public.projects set name='Updated',status='active',revision=2 where organization_id=current_setting('test.org_a')::uuid and id='cccccccc-cccc-4ccc-8ccc-cccccccccccc' and revision=1;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Owner edit failed'; end if;
 update public.projects set name='Stale',revision=2 where organization_id=current_setting('test.org_a')::uuid and id='cccccccc-cccc-4ccc-8ccc-cccccccccccc' and revision=1;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Stale edit allowed'; end if;
 begin update public.projects set name='Bypass'; raise exception 'Revision bypass allowed'; exception when serialization_failure then null; end;
 begin update public.projects set status='invalid',revision=3; raise exception 'Invalid status allowed'; exception when check_violation then null; end;
 begin update public.projects set id=gen_random_uuid(),revision=3; raise exception 'Identity mutation allowed'; exception when insufficient_privilege then null; end;
 if (select name from public.projects limit 1)<>'Updated' then raise exception 'Failed update modified project'; end if;
end $$;
insert into public.estimates(organization_id,id,project_id,title,lines) values(current_setting('test.org_a')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Draft','[{"id":"line","description":"Paint","quantity":"1.5","price":"0.03","unit":"m²"}]');
do $$ declare affected integer; begin
 if (select total_cents from public.estimates limit 1)<>5 then raise exception 'Half-up rounding failed'; end if;
 update public.estimates set lines='[{"id":"a","description":"Paint","quantity":"2","price":"10.25","unit":"item"},{"id":"b","description":"Work","quantity":"1.5","price":"0.03","unit":"fixed"}]',revision=2 where organization_id=current_setting('test.org_a')::uuid and revision=1;
 if (select total_cents from public.estimates limit 1)<>2055 then raise exception 'Total recompute failed'; end if;
 update public.estimates set title='Stale',revision=2 where revision=1;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Stale estimate saved'; end if;
 begin update public.estimates set title='Bypass'; raise exception 'Revision bypass'; exception when serialization_failure then null; end;
 begin update public.estimates set total_cents=1,revision=3; raise exception 'Total override'; exception when insufficient_privilege then null; end;
 begin update public.estimates set project_id=gen_random_uuid(),revision=3; raise exception 'Project reassignment'; exception when insufficient_privilege then null; end;
 begin update public.estimates set lines='[{"id":"a","description":"Bad","quantity":"0","price":"1","unit":"item"}]',revision=3; raise exception 'Zero quantity'; exception when invalid_parameter_value then null; end;
 begin update public.estimates set lines='[{"id":"a","description":"Bad","quantity":"1","price":"1.234","unit":"item"}]',revision=3; raise exception 'Excess precision'; exception when invalid_parameter_value then null; end;
 begin update public.estimates set lines='[{"id":"a","description":null,"quantity":"1","price":"1","unit":"item"}]',revision=3; raise exception 'Null description'; exception when invalid_parameter_value then null; end;
 begin update public.estimates set lines='{}',revision=3; raise exception 'Invalid JSON shape'; exception when invalid_parameter_value then null; end;
 if (select total_cents from public.estimates limit 1)<>2055 or (select revision from public.estimates limit 1)<>2 then raise exception 'Failed save was not atomic'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 update public.projects set name='Attack',revision=3 where organization_id=current_setting('test.org_a')::uuid;
 if found then raise exception 'Cross tenant update allowed'; end if;
 if exists(select 1 from public.estimates) then raise exception 'Estimate leak'; end if;
 update public.estimates set title='Attack',revision=3;
 if found then raise exception 'Cross tenant estimate update'; end if;
 begin insert into public.estimates(organization_id,project_id,title) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Attack'); raise exception 'Cross tenant estimate insert'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.projects) then raise exception 'Project leak'; end if;
 begin insert into public.projects(organization_id,name,client_name,city) values(current_setting('test.org_a')::uuid,'Attack','Client','City'); raise exception 'Cross tenant insert allowed'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.organizations) or exists(select 1 from public.organization_memberships) then raise exception 'Cross tenant leak'; end if;
 perform public.create_organization('Test B','FR','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 begin insert into public.estimates(organization_id,project_id,title) values((select id from public.organizations limit 1),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Wrong project'); raise exception 'Cross tenant project link'; exception when foreign_key_violation then null; end;
 if (select count(*) from public.organizations)<>1 then raise exception 'Tenant B isolation failed'; end if;
 if exists(select 1 from public.organizations where id=current_setting('test.org_a')::uuid) then raise exception 'Cross tenant ID lookup leak'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ begin
 begin perform public.create_organization('Unverified','BE',gen_random_uuid()); raise exception 'Unverified onboarding allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.estimates; raise exception 'Anonymous estimate access'; exception when insufficient_privilege then null; end;
 begin perform * from public.projects; raise exception 'Anonymous projects allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.organizations; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.create_organization('Anon','BE',gen_random_uuid()); raise exception 'Anonymous onboarding allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: estimate totals, atomic validation, tenant isolation, project links, immutable totals, stale writes; owner edits, stale conflict, revision bypass denial, immutable identity, cross-tenant update denial; projects read/create, cross-tenant project denial, invalid project denial, immutable project denial; own read, tenant isolation, direct write denial, anonymous denial, verified accounts, input validation, idempotency' as result;
rollback;

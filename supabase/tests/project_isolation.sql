
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
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.projects) then raise exception 'Project leak'; end if;
 begin insert into public.projects(organization_id,name,client_name,city) values(current_setting('test.org_a')::uuid,'Attack','Client','City'); raise exception 'Cross tenant insert allowed'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.organizations) or exists(select 1 from public.organization_memberships) then raise exception 'Cross tenant leak'; end if;
 perform public.create_organization('Test B','FR','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
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
 begin perform * from public.projects; raise exception 'Anonymous projects allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.organizations; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.create_organization('Anon','BE',gen_random_uuid()); raise exception 'Anonymous onboarding allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: projects read/create, cross-tenant project denial, invalid project denial, immutable project denial; own read, tenant isolation, direct write denial, anonymous denial, verified accounts, input validation, idempotency' as result;
rollback;


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
do $$ declare affected integer; begin
 update public.organizations set contact_address='Rue de la Paix 12',contact_email='office@example.test',contact_phone='+32 2 123 45 67',contact_revision=2 where id=current_setting('test.org_a')::uuid and contact_revision=1;
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Contact save failed'; end if;
 update public.organizations set contact_phone='Stale',contact_revision=2 where contact_revision=1;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Stale contact save'; end if;
 begin update public.organizations set contact_phone='Bypass'; raise exception 'Revision bypass'; exception when serialization_failure then null; end;
 begin update public.organizations set contact_email='bad',contact_revision=3; raise exception 'Invalid email'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 update public.organizations set contact_address='Attack',contact_revision=3 where id=current_setting('test.org_a')::uuid;
 if found then raise exception 'Cross tenant contact update'; end if;
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
 begin perform * from public.organizations; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.create_organization('Anon','BE',gen_random_uuid()); raise exception 'Anonymous onboarding allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: own read, tenant isolation, direct write denial, anonymous denial, verified accounts, input validation, idempotency' as result;
rollback;

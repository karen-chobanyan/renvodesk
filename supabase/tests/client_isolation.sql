begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','task-a@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','task-b@example.test',now(),false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org_a',public.create_organization('Tasks A','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org_a')::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Site A','Client','Brussels');

insert into public.clients(organization_id,id,name,email) values(current_setting('test.org_a')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','Client A','client@example.test'),(current_setting('test.org_a')::uuid,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Client B','');
insert into public.properties(organization_id,client_id,id,label,address,city) values(current_setting('test.org_a')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','ffffffff-ffff-4fff-8fff-ffffffffffff','Home','12 Main St','Brussels');
insert into public.projects(organization_id,name,client_name,city,client_id,property_id) values(current_setting('test.org_a')::uuid,'Linked project','Client A','Brussels','dddddddd-dddd-4ddd-8ddd-dddddddddddd','ffffffff-ffff-4fff-8fff-ffffffffffff');
do $$ begin
 if (select count(*) from public.clients)<>2 or (select count(*) from public.properties)<>1 then raise exception 'Own read failed'; end if;
 begin insert into public.projects(organization_id,name,client_name,city,client_id,property_id) values(current_setting('test.org_a')::uuid,'Mismatch','Client B','Brussels','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','ffffffff-ffff-4fff-8fff-ffffffffffff'); raise exception 'Wrong client property accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.projects(organization_id,name,client_name,city,property_id) values(current_setting('test.org_a')::uuid,'No client','Client B','Brussels','ffffffff-ffff-4fff-8fff-ffffffffffff'); raise exception 'Property without client accepted'; exception when check_violation then null; end;
 begin update public.clients set email='bad',revision=2; raise exception 'Invalid email accepted'; exception when check_violation then null; end;
 begin update public.properties set country='XX',revision=2; raise exception 'Invalid country'; exception when check_violation then null; end;
 begin update public.clients set name=' '; raise exception 'No revision accepted'; exception when serialization_failure then null; end;
 begin update public.properties set client_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'; raise exception 'Property moved'; exception when insufficient_privilege then null; end;
 update public.clients set name='Updated client',revision=2 where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' and revision=1;
 update public.clients set name='Stale client',revision=2 where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' and revision=1;
 if found then raise exception 'Stale match'; end if;
 update public.properties set address='Changed address',revision=2 where revision=1;
 if not exists(select 1 from public.projects where name='Linked project' and client_name='Client A') then raise exception 'Project snapshot changed'; end if;
 begin delete from public.clients; raise exception 'Delete allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select set_config('test.org_b',public.create_organization('Directory B','FR',gen_random_uuid())::text,true);
do $$ begin
 if exists(select 1 from public.clients) or exists(select 1 from public.properties) then raise exception 'Directory leak'; end if;
 update public.clients set name='attack',revision=3;
 if found then raise exception 'Cross tenant update'; end if;
 begin insert into public.clients(organization_id,name) values(current_setting('test.org_a')::uuid,'Attack'); raise exception 'Cross tenant insert'; exception when insufficient_privilege then null; end;
 begin insert into public.properties(organization_id,client_id,label,address,city) values(current_setting('test.org_b')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','Attack','Address','City'); raise exception 'Cross tenant property'; exception when foreign_key_violation then null; end;
 begin insert into public.projects(organization_id,name,client_name,city,client_id) values(current_setting('test.org_b')::uuid,'Attack','Client','City','dddddddd-dddd-4ddd-8ddd-dddddddddddd'); raise exception 'Cross tenant project'; exception when foreign_key_violation then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.clients; raise exception 'Anonymous clients'; exception when insufficient_privilege then null; end;
 begin perform * from public.properties; raise exception 'Anonymous properties'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: directory CRUD, revision safety, immutable ownership, client/property links, stable project snapshots and tenant/anonymous denial' as result;
rollback;

begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','owner@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','member@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','outsider@example.test',now(),false),
('44444444-4444-4444-8444-444444444444','unverified@example.test',null,false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.org',public.create_organization('Team fixture','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Site','Client','City');
insert into public.project_tasks(organization_id,project_id,id,title) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Assigned later'),(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Unassigned');
insert into public.project_budgets(organization_id,project_id,budget_cents) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',10000);
insert into public.project_costs(organization_id,project_id,description,category,amount_cents,incurred_on) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Secret expense','materials',1234,'2026-09-20');
insert into public.estimates(organization_id,project_id,title) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Secret estimate');
insert into public.clients(organization_id,id,name) values(current_setting('test.org')::uuid,'abababab-abab-4bab-8bab-abababababab','Private directory contact');
insert into public.properties(organization_id,client_id,label,address,city) values(current_setting('test.org')::uuid,'abababab-abab-4bab-8bab-abababababab','Property','Address','City');
insert into public.project_files(organization_id,project_id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Site.txt','text/plain',12);
select public.team_invite(current_setting('test.org')::uuid,' MEMBER@example.test ','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select public.team_invite(current_setting('test.org')::uuid,'member@example.test','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
do $$ begin if (select count(*) from public.team_invitations)<>1 then raise exception 'Duplicate retry'; end if; end $$;
select public.team_invite(current_setting('test.org')::uuid,'unverified@example.test','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
select public.team_invite(current_setting('test.org')::uuid,'member@example.test','ffffffff-ffff-4fff-8fff-ffffffffffff');
select public.team_revoke(current_setting('test.org')::uuid,'ffffffff-ffff-4fff-8fff-ffffffffffff');
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ begin
 begin perform public.team_invitation('dddddddd-dddd-4ddd-8ddd-dddddddddddd',true); raise exception 'Wrong recipient accepted'; exception when insufficient_privilege then null; end;
 begin perform public.team_members(current_setting('test.org')::uuid); raise exception 'Directory leaked'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
do $$ begin begin perform public.team_invitation('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true); raise exception 'Unverified accepted'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select * from public.team_invitation('dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
do $$ begin if exists(select 1 from public.organization_memberships) then raise exception 'Preview joined company'; end if; end $$;
select * from public.team_invitation('dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select * from public.team_invitation('dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
do $$ begin
 if (select count(*) from public.organization_memberships)<>1 then raise exception 'Membership replay'; end if;
 if (select count(*) from public.projects)<>1 then raise exception 'Member cannot see project'; end if;
 if exists(select 1 from public.project_budgets) or exists(select 1 from public.project_costs) or exists(select 1 from public.estimates) or exists(select 1 from public.clients) or exists(select 1 from public.properties) then raise exception 'Private records leaked'; end if;
 if not exists(select 1 from public.project_files) then raise exception 'Member cannot read files'; end if;
 if exists(select 1 from public.project_cost_summary(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where budget_cents is not null or total<>'0') then raise exception 'Financial summary leaked'; end if;
 begin insert into public.project_files(organization_id,project_id,original_name,mime_type,size_bytes) values(current_setting('test.org')::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Attack.txt','text/plain',12); raise exception 'Member uploaded'; exception when insufficient_privilege then null; end;
 update public.project_files set state='deleting'; if found then raise exception 'Member deleted files'; end if;
 begin insert into public.projects(organization_id,name,client_name,city) values(current_setting('test.org')::uuid,'Attack','Client','City'); raise exception 'Member created project'; exception when insufficient_privilege then null; end;
 update public.projects set name='Attack',revision=revision+1; if found then raise exception 'Member edited project'; end if;
 if exists(select 1 from public.team_invitations) then raise exception 'Invitation list leaked'; end if;
 begin perform public.team_invitation('ffffffff-ffff-4fff-8fff-ffffffffffff',true); raise exception 'Revoked accepted'; exception when insufficient_privilege then null; end;
 begin perform public.team_invite(current_setting('test.org')::uuid,'outsider@example.test',gen_random_uuid()); raise exception 'Member invited'; exception when insufficient_privilege then null; end;
 update public.project_tasks set title='Attack',revision=revision+1;
 if found then raise exception 'Edited unassigned task'; end if;
 delete from public.project_tasks;
 if found then raise exception 'Deleted task'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
update public.project_tasks set assignee_id='22222222-2222-4222-8222-222222222222',revision=revision+1 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
 begin update public.project_tasks set assignee_id='33333333-3333-4333-8333-333333333333',revision=revision+1 where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; raise exception 'Nonmember assigned'; exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
update public.project_tasks set status='done',revision=revision+1 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and revision=2;
do $$ begin
 if not exists(select 1 from public.project_tasks where status='done' and revision=3) then raise exception 'Assigned edit failed'; end if;
 update public.project_tasks set status='todo',revision=3 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and revision=2;
 if found then raise exception 'Stale write'; end if;
 begin update public.project_tasks set assignee_id=null,revision=revision+1 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; raise exception 'Member reassigned'; exception when insufficient_privilege then null; end;
 begin perform public.team_remove(current_setting('test.org')::uuid,'11111111-1111-4111-8111-111111111111'); raise exception 'Member removed owner'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select public.team_remove(current_setting('test.org')::uuid,'22222222-2222-4222-8222-222222222222');
do $$ begin if exists(select 1 from public.project_tasks where assignee_id is not null) then raise exception 'Dangling assignee'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.projects) then raise exception 'Removed member still reads'; end if;
 begin perform public.team_invitation('dddddddd-dddd-4ddd-8ddd-dddddddddddd',true); raise exception 'Removed member replayed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.team_invitations set expires_at=now()-interval '1 day' where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
update auth.users set email_confirmed_at=now() where id='44444444-4444-4444-8444-444444444444';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
do $$ begin begin perform public.team_invitation('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true); raise exception 'Expired accepted'; exception when insufficient_privilege then null; end; end $$;
set local role anon;
do $$ begin begin perform public.team_invitation('dddddddd-dddd-4ddd-8ddd-dddddddddddd',true); raise exception 'Anonymous accepted'; exception when insufficient_privilege then null; end; end $$;
reset role;
select 'PASS: invitation identity, expiry, revocation, replay, owner administration, assignee FK, task revisions and financial isolation' as result;
rollback;

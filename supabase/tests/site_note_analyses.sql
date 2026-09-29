-- Rollback-only verification of AI site-note analyses (decision 030).
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1','ai-owner@example.test',now(),false),
 ('b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2','ai-member@example.test',now(),false),
 ('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3','ai-other-owner@example.test',now(),false);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3","role":"authenticated"}',true);
select set_config('test.org_c',public.create_organization('AI other','BE',gen_random_uuid())::text,true);
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1","role":"authenticated"}',true);
select set_config('test.org',public.create_organization('AI fixture','BE',gen_random_uuid())::text,true);
insert into public.projects(organization_id,id,name,client_name,city) values
 (current_setting('test.org')::uuid,'d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4','Kitchen','Client','Namur'),
 (current_setting('test.org')::uuid,'e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5','Bathroom','Client','Namur');
insert into public.project_files(organization_id,project_id,id,original_name,mime_type,size_bytes) values
 (current_setting('test.org')::uuid,'d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4','f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1','note.webm','audio/webm',100),
 (current_setting('test.org')::uuid,'d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4','f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2','plan.pdf','application/pdf',100),
 (current_setting('test.org')::uuid,'d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4','f3f3f3f3-f3f3-4f3f-8f3f-f3f3f3f3f3f3','other.webm','audio/webm',100);
insert into storage.objects(bucket_id,name,metadata)
 select 'project-files',object_key,jsonb_build_object('size',100,'mimetype',mime_type)
 from public.project_files where organization_id=current_setting('test.org')::uuid;
update public.project_files set state='ready' where organization_id=current_setting('test.org')::uuid;

-- Fixed arguments for the owner's calls.
create temporary table args(k text primary key, v text) on commit drop;
insert into args values ('org',current_setting('test.org')),
 ('p','d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4'),('p2','e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5'),
 ('f','f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1'),('pdf','f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2'),
 ('f3','f3f3f3f3-f3f3-4f3f-8f3f-f3f3f3f3f3f3');
create function pg_temp.a(key text) returns uuid language sql as $$select v::uuid from args where k=key$$;
create function pg_temp.start(file uuid, req uuid, prompt text default 'aaaaaaaaaaaa', model text default 'gpt-6-luna')
 returns table(analysis_id uuid, outcome text) language sql as
 $$select * from public.begin_site_note_analysis(pg_temp.a('org'),pg_temp.a('p'),file,req,prompt,'gpt-transcribe',model)$$;

do $$ declare r record; first_id uuid; begin
 select * into r from pg_temp.start(pg_temp.a('f'),'10000000-0000-4000-8000-000000000001');
 if r.outcome<>'disabled' or r.analysis_id is not null then raise exception 'Disabled company started a job: %',r.outcome; end if;
 if (select enabled from public.site_note_ai_status(pg_temp.a('org'))) then raise exception 'Status reports enabled'; end if;
 begin insert into public.site_note_analyses(organization_id,project_id,file_id,request_id,requested_by,transcription_model,proposal_model,prompt_version,lease_expires_at)
  values(pg_temp.a('org'),pg_temp.a('p'),pg_temp.a('f'),gen_random_uuid(),auth.uid(),'m','m','aaaaaaaaaaaa',now());
  raise exception 'Direct insert allowed'; exception when insufficient_privilege then null; end;
end $$;

reset role;
insert into private.ai_site_note_entitlements(organization_id,enabled,daily_limit)
 values(current_setting('test.org')::uuid,true,3);
insert into public.organization_memberships(organization_id,user_id,role)
 values(current_setting('test.org')::uuid,'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2','member');
set local role authenticated;

do $$ declare r record; first_id uuid; begin
 if (select remaining from public.site_note_ai_status(pg_temp.a('org')))<>3 then raise exception 'Remaining quota wrong'; end if;
 select * into r from public.begin_site_note_analysis(pg_temp.a('org'),pg_temp.a('p2'),pg_temp.a('f'),gen_random_uuid(),'aaaaaaaaaaaa','gpt-transcribe','gpt-6-luna');
 if r.outcome<>'file_unavailable' then raise exception 'Cross-project file accepted: %',r.outcome; end if;
 select * into r from pg_temp.start(pg_temp.a('pdf'),gen_random_uuid());
 if r.outcome<>'unsupported_audio' then raise exception 'PDF accepted: %',r.outcome; end if;

 select * into r from pg_temp.start(pg_temp.a('f'),'10000000-0000-4000-8000-000000000002');
 if r.outcome<>'created' then raise exception 'Start failed: %',r.outcome; end if;
 first_id := r.analysis_id;
 select * into r from pg_temp.start(pg_temp.a('f'),'10000000-0000-4000-8000-000000000002');
 if r.outcome<>'existing' or r.analysis_id<>first_id then raise exception 'Retry not idempotent'; end if;
 begin perform pg_temp.start(pg_temp.a('f'),'10000000-0000-4000-8000-000000000002','bbbbbbbbbbbb');
  raise exception 'Changed retry accepted'; exception when invalid_parameter_value then null; end;
 select * into r from pg_temp.start(pg_temp.a('f3'),gen_random_uuid());
 if r.outcome<>'user_running' then raise exception 'Second running job allowed: %',r.outcome; end if;

 if public.advance_site_note_analysis(pg_temp.a('org'),first_id,'proposing') then raise exception 'Skipped a state'; end if;
 if not public.advance_site_note_analysis(pg_temp.a('org'),first_id,'transcribing') then raise exception 'Advance failed'; end if;
 if public.complete_site_note_analysis(pg_temp.a('org'),first_id,'Note','Summary','ready','[]',0,'{}') then raise exception 'Completed before proposing'; end if;
 if not public.advance_site_note_analysis(pg_temp.a('org'),first_id,'proposing') then raise exception 'Advance to proposing failed'; end if;
 begin update public.site_note_analyses set transcript='forged'; raise exception 'Direct update allowed'; exception when insufficient_privilege then null; end;
 if not public.complete_site_note_analysis(pg_temp.a('org'),first_id,'Marc pose le carrelage.','Carrelage.','ready',
  '[{"title":"Poser","notes":"","evidence":"Marc pose","assigneeId":null,"startDate":null,"dueDate":null}]',0,'{"input_tokens":10}')
  then raise exception 'Complete failed'; end if;
 if public.complete_site_note_analysis(pg_temp.a('org'),first_id,'x','x','ready','[]',0,'{}') then raise exception 'Terminal row rewritten'; end if;
 if public.fail_site_note_analysis(pg_temp.a('org'),first_id,'late_failure') then raise exception 'Ready row failed'; end if;
 if not exists(select 1 from public.site_note_analyses where id=first_id and status='ready'
  and expires_at between now()+interval '29 days' and now()+interval '31 days') then raise exception 'Ready row or retention wrong'; end if;

 select * into r from pg_temp.start(pg_temp.a('f'),gen_random_uuid());
 if r.outcome<>'reused' or r.analysis_id<>first_id then raise exception 'Saved result not reused: %',r.outcome; end if;
 if (select remaining from public.site_note_ai_status(pg_temp.a('org')))<>2 then raise exception 'Reuse was charged'; end if;

 select * into r from pg_temp.start(pg_temp.a('f'),gen_random_uuid(),'bbbbbbbbbbbb');
 if r.outcome<>'created' then raise exception 'New prompt version not started: %',r.outcome; end if;
 if not public.fail_site_note_analysis(pg_temp.a('org'),r.analysis_id,'transcription_upstream') then raise exception 'Fail failed'; end if;
 select * into r from pg_temp.start(pg_temp.a('f3'),gen_random_uuid());
 if r.outcome<>'created' then raise exception 'Third job not started: %',r.outcome; end if;
 perform set_config('test.running',r.analysis_id::text,true);
 perform public.advance_site_note_analysis(pg_temp.a('org'),r.analysis_id,'transcribing');
 perform public.advance_site_note_analysis(pg_temp.a('org'),r.analysis_id,'proposing');
end $$;

-- Deleting the recording while its job runs: completion must not store content.
update public.project_files set state='deleting' where id='f3f3f3f3-f3f3-4f3f-8f3f-f3f3f3f3f3f3';
do $$ declare r record; begin
 if public.complete_site_note_analysis(pg_temp.a('org'),current_setting('test.running')::uuid,'Late','Late','ready','[]',0,'{}')
  then raise exception 'Completed after file deletion'; end if;
 if not public.fail_site_note_analysis(pg_temp.a('org'),current_setting('test.running')::uuid,'file_deleted') then raise exception 'Could not fail purged job'; end if;
 select * into r from pg_temp.start(pg_temp.a('f'),gen_random_uuid(),'cccccccccccc');
 if r.outcome<>'company_daily' then raise exception 'Daily limit not enforced: %',r.outcome; end if;
end $$;

-- Member and other-company owner see nothing and cannot start jobs.
select set_config('request.jwt.claims','{"sub":"b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.site_note_analyses) then raise exception 'Member read analyses'; end if;
 begin perform pg_temp.start(pg_temp.a('f'),gen_random_uuid()); raise exception 'Member started a job'; exception when insufficient_privilege then null; end;
 begin perform public.site_note_ai_status(pg_temp.a('org')); raise exception 'Member read status'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.site_note_analyses) then raise exception 'Other company read analyses'; end if;
 begin perform pg_temp.start(pg_temp.a('f'),gen_random_uuid()); raise exception 'Other owner started a job'; exception when insufficient_privilege then null; end;
 begin perform public.fail_site_note_analysis(pg_temp.a('org'),gen_random_uuid(),'x'); raise exception 'Other owner wrote'; exception when insufficient_privilege then null; end;
end $$;

-- Global monthly cap, lease expiry and retention purge.
reset role;
update private.ai_site_note_entitlements set daily_limit=100 where organization_id=current_setting('test.org')::uuid;
update private.ai_site_note_settings set global_monthly_limit=(select used from private.ai_site_note_global_usage
 where month=date_trunc('month', now() at time zone 'Europe/Brussels')::date);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1","role":"authenticated"}',true);
do $$ declare r record; begin
 select * into r from pg_temp.start(pg_temp.a('f'),gen_random_uuid(),'dddddddddddd');
 if r.outcome<>'global_monthly' then raise exception 'Global cap not enforced: %',r.outcome; end if;
end $$;
reset role;
update private.ai_site_note_settings set global_monthly_limit=2000;
set local role authenticated;
do $$ declare r record; begin
 select * into r from pg_temp.start(pg_temp.a('f'),gen_random_uuid(),'eeeeeeeeeeee');
 if r.outcome<>'created' then raise exception 'Start after cap reset failed: %',r.outcome; end if;
 perform set_config('test.stale',r.analysis_id::text,true);
end $$;
reset role;
update public.site_note_analyses set lease_expires_at=now()-interval '1 second' where id=current_setting('test.stale')::uuid;
set local role authenticated;
do $$ begin
 if public.advance_site_note_analysis(pg_temp.a('org'),current_setting('test.stale')::uuid,'transcribing') then raise exception 'Expired lease advanced'; end if;
end $$;
reset role;
update public.site_note_analyses set expires_at=now()-interval '1 second'
 where organization_id=current_setting('test.org')::uuid and status='ready';
select private.purge_expired_site_note_analyses();
do $$ begin
 if (select status||':'||failure_reason from public.site_note_analyses where id=current_setting('test.stale')::uuid)<>'failed:lease_expired'
  then raise exception 'Expired lease not closed'; end if;
 if exists(select 1 from public.site_note_analyses where organization_id=current_setting('test.org')::uuid
  and (transcript is not null or summary is not null or proposal is not null) and expires_at<=now())
  then raise exception 'Expired content not purged'; end if;
 if not exists(select 1 from cron.job where jobname='purge-site-note-analyses') then raise exception 'Purge not scheduled'; end if;
end $$;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.site_note_analyses where status='ready') then raise exception 'Expired row visible'; end if;
end $$;
reset role;
select 'PASS: disabled company, file/project scope, MIME, idempotent start, changed retry, one running job per user, legal transitions, no direct writes, 30-day retention, free reuse, daily and global limits, delete-while-running purge, member and cross-company denial, lease expiry, retention purge, cron schedule' as result;
rollback;

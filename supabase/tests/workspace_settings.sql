begin;

insert into auth.users(id, email, email_confirmed_at, is_anonymous) values
  ('15151515-1515-4151-8151-151515151515', 'settings-owner@example.test', now(), false),
  ('25252525-2525-4252-8252-252525252525', 'settings-member@example.test', now(), false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15151515-1515-4151-8151-151515151515","role":"authenticated"}', true);
select set_config('test.settings_org', public.create_organization('Settings fixture', 'BE', gen_random_uuid())::text, true);

update public.organizations
set country = 'FR', default_language = 'en', settings_revision = 2
where id = current_setting('test.settings_org')::uuid and settings_revision = 1;

do $$
begin
  if not exists (
    select 1 from public.organizations
    where id = current_setting('test.settings_org')::uuid
      and country = 'FR' and default_language = 'en'
      and settings_revision = 2 and contact_revision = 1
  ) then raise exception 'Owner settings save or independent revision failed'; end if;

  update public.organizations
  set country = 'NL', settings_revision = 3
  where id = current_setting('test.settings_org')::uuid and settings_revision = 1;
  if found then raise exception 'Stale settings update succeeded'; end if;

  begin
    update public.organizations set default_language = 'fr'
    where id = current_setting('test.settings_org')::uuid;
    raise exception 'Settings update without revision succeeded';
  exception when serialization_failure then null;
  end;

  begin
    update public.organizations set default_language = 'de', settings_revision = 3
    where id = current_setting('test.settings_org')::uuid;
    raise exception 'Unsupported language succeeded';
  exception when check_violation then null;
  end;

  begin
    update public.organizations set country = 'US', settings_revision = 3
    where id = current_setting('test.settings_org')::uuid;
    raise exception 'Unsupported country succeeded';
  exception when check_violation then null;
  end;

  begin
    update public.organizations set name = 'Attack'
    where id = current_setting('test.settings_org')::uuid;
    raise exception 'Immutable name changed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

update public.organizations
set contact_phone = '+32 1 23 45 67', contact_revision = 2
where id = current_setting('test.settings_org')::uuid and contact_revision = 1;
do $$
begin
  if not exists (
    select 1 from public.organizations
    where id = current_setting('test.settings_org')::uuid
      and contact_revision = 2 and settings_revision = 2
  ) then raise exception 'Contact edit advanced settings revision'; end if;
end;
$$;

reset role;
insert into public.organization_memberships(organization_id, user_id, role)
values (current_setting('test.settings_org')::uuid, '25252525-2525-4252-8252-252525252525', 'member');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"25252525-2525-4252-8252-252525252525","role":"authenticated"}', true);
do $$
begin
  if not exists (select 1 from public.organizations where id = current_setting('test.settings_org')::uuid)
    then raise exception 'Member cannot read workspace'; end if;
  update public.organizations set default_language = 'fr', settings_revision = 3
  where id = current_setting('test.settings_org')::uuid;
  if found then raise exception 'Member changed workspace settings'; end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.organizations where id = current_setting('test.settings_org')::uuid;
    raise exception 'Anonymous workspace read succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.organizations set country = 'BE', settings_revision = 3
    where id = current_setting('test.settings_org')::uuid;
    raise exception 'Anonymous settings update succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: owner settings, independent revisions, validation and member/anonymous denial' as result;
rollback;

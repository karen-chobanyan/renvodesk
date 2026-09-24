-- Workspace language and location are independent of document contact edits.
alter table public.organizations
  add column default_language text not null default 'fr'
    check (default_language in ('fr', 'en')),
  add column settings_revision integer not null default 1
    check (settings_revision > 0);

grant update(country, default_language, settings_revision)
  on public.organizations to authenticated;

-- Existing owner RLS policy also covers these narrowly granted columns.
create function private.check_organization_settings_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.settings_revision <> old.settings_revision + 1 then
    raise exception 'Stale workspace settings revision' using errcode = '40001';
  end if;
  return new;
end;
$$;
revoke all on function private.check_organization_settings_revision()
  from public, anon, authenticated;

create trigger organizations_settings_revision
before update of country, default_language, settings_revision
on public.organizations for each row
execute function private.check_organization_settings_revision();

-- The existing contact trigger runs for every organization update. Let settings
-- updates pass without advancing the independent contact revision.
create or replace function private.check_contact_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.contact_address is distinct from old.contact_address
    or new.contact_email is distinct from old.contact_email
    or new.contact_phone is distinct from old.contact_phone
    or new.contact_revision is distinct from old.contact_revision then
    if new.contact_revision <> old.contact_revision + 1 then
      raise exception 'Stale contact revision' using errcode = '40001';
    end if;
  end if;
  return new;
end;
$$;

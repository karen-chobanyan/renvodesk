alter table public.organizations
 add column contact_address text not null default '' check(char_length(contact_address)<=300),
 add column contact_email text not null default '' check(char_length(contact_email)<=254 and (contact_email='' or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
 add column contact_phone text not null default '' check(char_length(contact_phone)<=50),
 add column contact_revision integer not null default 1 check(contact_revision>0);
grant update(contact_address,contact_email,contact_phone,contact_revision) on public.organizations to authenticated;
create policy organizations_owner_contacts on public.organizations for update to authenticated
using(id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'))
with check(id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and role='owner'));
create function private.check_contact_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.contact_revision<>old.contact_revision+1 then raise exception 'Stale contact revision' using errcode='40001'; end if;
 return new;
end;
$$;
revoke all on function private.check_contact_revision() from public,anon,authenticated;
create trigger organizations_contacts_revision before update on public.organizations for each row execute function private.check_contact_revision();

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { useOrganizationRecord } from "./organization-query";
import { type getOrganization, saveContacts } from "./organization-service";
import { ContactFields, contactsCopy } from "./settings-fields";
import { SettingsForm, SettingsSection, settingsCopy } from "./settings-layout";
import { workspaceKeys } from "./workspace-context";

type OrganizationRecord = NonNullable<
  Awaited<ReturnType<typeof getOrganization>>
>;
function snapshot(record: OrganizationRecord) {
  return {
    revision: record.contact_revision,
    value: {
      contact_address: record.contact_address,
      contact_email: record.contact_email,
      contact_phone: record.contact_phone,
    },
  };
}
export function CompanyContacts({ id }: { id: string }) {
  const { locale } = useLocale();
  const c = contactsCopy[locale],
    common = settingsCopy[locale];
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const client = useQueryClient();
  const query = useOrganizationRecord(id);
  const record = query.data;
  return (
    <SettingsSection title={c.title} hint={c.hint}>
      {!record ? (
        !query.isPending ? (
          <div role="alert">
            <p>{common.loadFailed}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              {common.retry}
            </Button>
          </div>
        ) : (
          <p role="status">{common.loading}</p>
        )
      ) : (
        <SettingsForm
          name="contacts"
          snapshot={snapshot(record)}
          saveLabel={c.save}
          savedLabel={c.saved}
          reloadLabel={c.reload}
          onReload={async () => {
            const result = await query.refetch();
            if (result.isError || !result.data) return null;
            return snapshot(result.data);
          }}
          onSave={async (value, revision) => {
            const next = await saveContacts(id, revision, {
              contact_address: value.contact_address.trim(),
              contact_email: value.contact_email.trim(),
              contact_phone: value.contact_phone.trim(),
            });
            if (!next) return null;
            client.setQueryData(
              workspaceKeys.organization(userId, id),
              (old: OrganizationRecord | null | undefined) =>
                old
                  ? {
                      ...old,
                      ...snapshot(next).value,
                      contact_revision: next.contact_revision,
                    }
                  : next,
            );
            return snapshot(next);
          }}
        >
          {(value, change) => <ContactFields value={value} onChange={change} />}
        </SettingsForm>
      )}
      {query.isError && record && <p role="alert">{common.loadFailed}</p>}
    </SettingsSection>
  );
}

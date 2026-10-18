import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { useOrganizationRecord } from "./organization-query";
import {
  type getOrganization,
  type Organization,
  saveWorkspacePreferences,
} from "./organization-service";
import {
  PreferencesFields,
  type PreferencesValues,
  preferencesCopy,
} from "./settings-fields";
import { SettingsForm, SettingsSection, settingsCopy } from "./settings-layout";
import { workspaceKeys } from "./workspace-context";

type OrganizationRecord = NonNullable<
  Awaited<ReturnType<typeof getOrganization>>
>;
function snapshot(record: OrganizationRecord) {
  return {
    revision: record.settings_revision,
    value: {
      country: record.country as PreferencesValues["country"],
      default_language:
        record.default_language as PreferencesValues["default_language"],
    },
  };
}

export function WorkspacePreferences({ id }: { id: string }) {
  const { locale, saveWorkspaceLanguage } = useLocale();
  const c = preferencesCopy[locale],
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
          name="preferences"
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
            const next = await saveWorkspacePreferences(id, revision, value);
            if (!next) return null;
            client.setQueryData(
              workspaceKeys.organization(userId, id),
              (old: OrganizationRecord | null | undefined) =>
                old
                  ? {
                      ...old,
                      country: next.country,
                      default_language: next.default_language,
                      settings_revision: next.settings_revision,
                    }
                  : next,
            );
            client.setQueryData(
              workspaceKeys.organizations(userId),
              (old: Organization[] | undefined) =>
                old?.map((row) =>
                  row.id === id
                    ? {
                        ...row,
                        country: next.country,
                        default_language: next.default_language,
                      }
                    : row,
                ),
            );
            saveWorkspaceLanguage(
              id,
              next.default_language === "en" ? "en" : "fr",
            );
            return snapshot(next);
          }}
        >
          {(value, change) => (
            <PreferencesFields
              value={value}
              onChange={change}
              accountHref="/workspace/account"
            />
          )}
        </SettingsForm>
      )}
      {query.isError && record && <p role="alert">{common.loadFailed}</p>}
    </SettingsSection>
  );
}

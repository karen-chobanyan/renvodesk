import { useState } from "react";
import {
  ContactFields,
  type ContactValues,
  contactsCopy,
  PreferencesFields,
  type PreferencesValues,
  preferencesCopy,
} from "@/features/organizations/settings-fields";
import {
  SettingsForm,
  SettingsLayout,
  SettingsSection,
} from "@/features/organizations/settings-layout";
import { StorageUsageView } from "@/features/storage-usage/storage-usage-view";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoStorage } from "./demo-directory";

export function DemoSettingsPage() {
  const { locale } = useLocale();
  const contacts = contactsCopy[locale],
    preferences = preferencesCopy[locale],
    d = useDemoCopy();
  const { company, saveCompany } = useDemo();
  const [contactRevision, setContactRevision] = useState(1),
    [preferencesRevision, setPreferencesRevision] = useState(1);
  const [refreshed, setRefreshed] = useState(false);
  const contactSnapshot = {
    revision: contactRevision,
    value: {
      contact_address: company.contact_address,
      contact_email: company.contact_email,
      contact_phone: company.contact_phone,
    },
  };
  const preferenceSnapshot = {
    revision: preferencesRevision,
    value: { country: company.country, default_language: company.language },
  };
  return (
    <section className="connected-workspace">
      <SettingsLayout
        company={company.name}
        teamHref="/team"
        accountHref="/account"
      >
        <SettingsSection title={contacts.title} hint={contacts.hint}>
          <SettingsForm<ContactValues>
            name="contacts"
            snapshot={contactSnapshot}
            saveLabel={contacts.save}
            savedLabel={d.settingsSaved}
            reloadLabel={contacts.reload}
            onReload={async () => contactSnapshot}
            onSave={async (value) => {
              const next = {
                contact_address: value.contact_address.trim(),
                contact_email: value.contact_email.trim(),
                contact_phone: value.contact_phone.trim(),
              };
              saveCompany(next);
              setContactRevision((n) => n + 1);
              return { value: next, revision: contactRevision + 1 };
            }}
          >
            {(value, change) => (
              <ContactFields value={value} onChange={change} />
            )}
          </SettingsForm>
        </SettingsSection>
        <SettingsSection title={preferences.title} hint={preferences.hint}>
          <SettingsForm<PreferencesValues>
            name="preferences"
            snapshot={preferenceSnapshot}
            saveLabel={preferences.save}
            savedLabel={d.settingsSaved}
            reloadLabel={preferences.reload}
            onReload={async () => preferenceSnapshot}
            onSave={async (value) => {
              saveCompany({
                country: value.country,
                language: value.default_language,
              });
              setPreferencesRevision((n) => n + 1);
              return { value, revision: preferencesRevision + 1 };
            }}
          >
            {(value, change) => (
              <PreferencesFields
                value={value}
                onChange={change}
                accountHref="/account"
              />
            )}
          </SettingsForm>
        </SettingsSection>
        <StorageUsageView
          usage={demoStorage}
          settings
          refreshed={refreshed}
          onRefresh={() => setRefreshed(true)}
          note={d.storageDemo}
        />
      </SettingsLayout>
    </section>
  );
}

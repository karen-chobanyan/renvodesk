import { AccountSettingsView } from "@/features/auth/account-settings-view";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoMembers } from "./demo-directory";

export function DemoAccountPage() {
  const { locale } = useLocale();
  const d = useDemoCopy();
  const { accountProfile, saveAccountProfile } = useDemo();
  return (
    <AccountSettingsView
      email={demoMembers[0].email}
      initialProfile={{
        name: accountProfile.name,
        language: accountProfile.language ?? locale,
      }}
      onSaveProfile={async (profile) => {
        saveAccountProfile(profile);
        return profile;
      }}
      demoNote={d.passwordDemo}
      profileSavedLabel={d.settingsSaved}
    />
  );
}

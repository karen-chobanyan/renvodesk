import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import { AccountSettingsView } from "./account-settings-view";
import { useAuth } from "./auth-provider";

export function AccountSettingsPage() {
  const { session } = useAuth();
  const { locale } = useLocale();
  const user = session?.user;
  if (!user) return null;
  const name =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const language =
    user.user_metadata.preferred_language === "en" ||
    user.user_metadata.preferred_language === "fr"
      ? user.user_metadata.preferred_language
      : locale;
  return (
    <AccountSettingsView
      key={user.id}
      email={user.email ?? ""}
      initialProfile={{ name, language }}
      onSaveProfile={async (profile) => {
        const { error } = await requireSupabase().auth.updateUser({
          data: {
            full_name: profile.name,
            preferred_language: profile.language,
          },
        });
        if (error) throw error;
        return profile;
      }}
      onChangePassword={async (currentPassword, password) => {
        const { error } = await requireSupabase().auth.updateUser({
          current_password: currentPassword,
          password,
        });
        if (error) throw error;
      }}
    />
  );
}

import { LegalPage } from "./legal-page";
export function PrivacyPage({ locale }: { locale: "fr" | "en" }) {
  return <LegalPage locale={locale} kind="privacy" />;
}

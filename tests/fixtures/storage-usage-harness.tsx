import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { StorageUsage } from "../../src/features/storage-usage/storage-usage";
import { LocaleProvider, useLocale } from "../../src/lib/i18n";
import "../../src/styles.css";

function Harness() {
  const { locale, setLocale } = useLocale();
  const [org, setOrg] = useState("first");
  return (
    <main>
      <button
        type="button"
        onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
      >
        Language
      </button>
      <button
        type="button"
        onClick={() => setOrg(org === "first" ? "second" : "first")}
      >
        Switch company
      </button>
      <StorageUsage organizationId={org} />
    </main>
  );
}

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider>
        <Harness />
      </LocaleProvider>
    </QueryClientProvider>,
  );

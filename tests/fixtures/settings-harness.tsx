import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { CompanyContacts } from "../../src/features/organizations/company-contacts";
import { SettingsLayout } from "../../src/features/organizations/settings-layout";
import { WorkspacePreferences } from "../../src/features/organizations/workspace-preferences";
import { StorageUsage } from "../../src/features/storage-usage/storage-usage";
import { LocaleProvider } from "../../src/lib/i18n";
import "../../src/styles.css";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <BrowserRouter>
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <Routes>
            <Route
              path="/settings-harness"
              element={
                <main className="app-content">
                  <SettingsLayout
                    company="Atelier des Tilleuls"
                    teamHref="/team-test"
                    accountHref="/workspace/account"
                  >
                    <CompanyContacts id={id} />
                    <WorkspacePreferences id={id} />
                    <StorageUsage organizationId={id} settings />
                  </SettingsLayout>
                  <button
                    type="button"
                    onClick={() => void client.invalidateQueries()}
                  >
                    Background refresh
                  </button>
                </main>
              }
            />
            <Route
              path="*"
              element={
                <main>
                  <h1>Destination</h1>
                  <Link to="/settings-harness">Settings</Link>
                </main>
              }
            />
          </Routes>
        </LocaleProvider>
      </QueryClientProvider>
    </BrowserRouter>,
  );

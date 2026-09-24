import { createRoot } from "react-dom/client";
import { WorkspacePreferences } from "../../src/features/organizations/workspace-preferences";
import { LocaleProvider } from "../../src/lib/i18n";
import "../../src/styles.css";

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <LocaleProvider>
      <main className="connected-workspace workspace-settings">
        <WorkspacePreferences id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />
      </main>
    </LocaleProvider>,
  );

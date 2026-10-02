import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { SketchPage } from "./features/sketches/sketch-page";
import { OwnerRoute } from "./features/team/company-access";
import { InvitationPage } from "./features/team/invitation-page";
import { TeamPage } from "./features/team/team-page";
import { ConsentControls } from "./lib/telemetry/consent-controls";
import { reportError, trackPage } from "./lib/telemetry/runtime";
import "@fontsource-variable/inter";
import "./styles.css";
import { AppShell } from "./components/app-shell";
import { EmptyState } from "./components/shared";
import { Button } from "./components/ui/button";
import { AccountSettingsPage } from "./features/auth/account-settings-page";
import { AuthCallback, AuthPage } from "./features/auth/auth-page";
import { AuthProvider, RequireAuth } from "./features/auth/auth-provider";
import { ClientsPage } from "./features/clients/clients-page";
import { DemoAccountPage } from "./features/demo/demo-account-page";
import { DemoClientsPage } from "./features/demo/demo-clients-page";
import { DemoEstimatePage } from "./features/demo/demo-estimate-page";
import { DemoEstimatesPage } from "./features/demo/demo-estimates";
import { DemoProjectPage } from "./features/demo/demo-project-page";
import { DemoSchedulePage } from "./features/demo/demo-schedule-page";
import { DemoSettingsPage } from "./features/demo/demo-settings-page";
import { DemoTeamPage } from "./features/demo/demo-team-page";
import { DesignPage } from "./features/design/design-page";
import { CompanyEstimatesPage } from "./features/estimates/company-estimates-page";
import { SavedEstimatePage } from "./features/estimates/saved-estimate-page";
import {
  SessionQueryProvider,
  WorkspaceDataRoute,
} from "./features/organizations/workspace-data";
import { WorkspacePage } from "./features/organizations/workspace-page";
import { ProjectsPage } from "./features/projects/projects-page";
import { SavedProjectPage } from "./features/projects/saved-project-page";
import { SchedulePage } from "./features/tasks/schedule-page";
import { DemoProvider } from "./lib/demo-store";
import { LocaleProvider, useLocale } from "./lib/i18n";

function NotFound() {
  const { t } = useLocale();
  return (
    <EmptyState
      title={t("notFound")}
      description=""
      action={
        <Button asChild>
          <Link to="/projects">{t("home")}</Link>
        </Button>
      }
    />
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    reportError(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function RouteTelemetry() {
  const location = useLocation();
  React.useEffect(() => {
    trackPage(location.pathname);
  }, [location.pathname]);
  return null;
}
function StandaloneConsentLayout() {
  const { locale } = useLocale();
  return (
    <>
      <Outlet />
      <footer className="app-footer">
        <ConsentControls locale={locale} placement="footer" />
      </footer>
    </>
  );
}
function Application() {
  const { t } = useLocale();
  return (
    <ErrorBoundary
      fallback={
        <EmptyState
          title={t("errorTitle")}
          description={t("errorText")}
          action={
            <Button onClick={() => window.location.reload()}>
              {t("reload")}
            </Button>
          }
        />
      }
    >
      <AuthProvider>
        <SessionQueryProvider>
          <DemoProvider>
            <BrowserRouter>
              <RouteTelemetry />
              <Routes>
                <Route element={<StandaloneConsentLayout />}>
                  <Route
                    path="login"
                    element={<AuthPage key="login" mode="login" />}
                  />
                  <Route
                    path="signup"
                    element={<AuthPage key="signup" mode="signup" />}
                  />
                  <Route
                    path="auth/forgot"
                    element={<AuthPage key="request" mode="request" />}
                  />
                  <Route
                    path="auth/reset"
                    element={<AuthPage key="update" mode="update" />}
                  />
                  <Route path="auth/callback" element={<AuthCallback />} />
                  <Route path="invite/:id" element={<InvitationPage />} />
                </Route>
                <Route element={<RequireAuth />}>
                  <Route path="workspace" element={<WorkspaceDataRoute />}>
                    <Route index element={<WorkspacePage />} />
                    <Route path="account" element={<AccountSettingsPage />} />
                    <Route
                      path=":organizationId/projects/:id/sketches/:sketchId"
                      element={<SketchPage />}
                    />
                    <Route element={<OwnerRoute />}>
                      <Route
                        path=":organizationId/team"
                        element={<TeamPage />}
                      />
                      <Route
                        path=":organizationId/clients"
                        element={<ClientsPage />}
                      />
                      <Route
                        path=":organizationId/estimates"
                        element={<CompanyEstimatesPage />}
                      />
                      <Route
                        path=":organizationId/settings"
                        element={<WorkspacePage settings />}
                      />
                    </Route>
                    <Route
                      path=":organizationId/schedule"
                      element={<SchedulePage />}
                    />
                    <Route element={<OwnerRoute />}>
                      <Route
                        path=":organizationId/projects/:id/estimates/:estimateId"
                        element={<SavedEstimatePage />}
                      />
                    </Route>
                    <Route
                      path=":organizationId/projects/:id"
                      element={<SavedProjectPage />}
                    />
                  </Route>
                </Route>

                <Route element={<AppShell />}>
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:id" element={<DemoProjectPage />} />
                  <Route path="estimates" element={<DemoEstimatesPage />} />
                  <Route path="estimates/:id" element={<DemoEstimatePage />} />
                  <Route path="schedule" element={<DemoSchedulePage />} />
                  <Route path="clients" element={<DemoClientsPage />} />
                  <Route path="team" element={<DemoTeamPage />} />
                  <Route path="settings" element={<DemoSettingsPage />} />
                  <Route path="account" element={<DemoAccountPage />} />
                  <Route path="design-system" element={<DesignPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </DemoProvider>
        </SessionQueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <LocaleProvider>
      <Application />
    </LocaleProvider>
  </React.StrictMode>,
);

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router";
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
import { AuthCallback, AuthPage } from "./features/auth/auth-page";
import { AuthProvider, RequireAuth } from "./features/auth/auth-provider";
import { ClientsPage } from "./features/clients/clients-page";
import { DesignPage } from "./features/design/design-page";
import { CompanyEstimatesPage } from "./features/estimates/company-estimates-page";
import { EstimatePage } from "./features/estimates/estimate-page";
import { SavedEstimatePage } from "./features/estimates/saved-estimate-page";
import { WorkspacePage } from "./features/organizations/workspace-page";
import { ProjectPage } from "./features/projects/project-page";
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
function Application() {
  const { t, locale } = useLocale();
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
        <DemoProvider>
          <BrowserRouter>
            <RouteTelemetry />
            <ConsentControls locale={locale} />
            <Routes>
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
              <Route element={<RequireAuth />}>
                <Route path="workspace" element={<WorkspacePage />} />
                <Route
                  path="workspace/:organizationId/projects/:id/sketches/:sketchId"
                  element={<SketchPage />}
                />
                <Route element={<OwnerRoute />}>
                  <Route
                    path="workspace/:organizationId/team"
                    element={<TeamPage />}
                  />
                  <Route
                    path="workspace/:organizationId/clients"
                    element={<ClientsPage />}
                  />
                  <Route
                    path="workspace/:organizationId/estimates"
                    element={<CompanyEstimatesPage />}
                  />
                  <Route
                    path="workspace/:organizationId/settings"
                    element={<WorkspacePage settings />}
                  />
                </Route>
                <Route
                  path="workspace/:organizationId/schedule"
                  element={<SchedulePage />}
                />
                <Route element={<OwnerRoute />}>
                  <Route
                    path="workspace/:organizationId/projects/:id/estimates/:estimateId"
                    element={<SavedEstimatePage />}
                  />
                </Route>
                <Route
                  path="workspace/:organizationId/projects/:id"
                  element={<SavedProjectPage />}
                />
              </Route>

              <Route element={<AppShell />}>
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectPage />} />
                <Route path="estimates/:id" element={<EstimatePage />} />
                <Route path="design-system" element={<DesignPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DemoProvider>
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

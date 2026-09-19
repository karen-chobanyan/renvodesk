import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router";
import "@fontsource-variable/inter";
import "./styles.css";
import { AppShell } from "./components/app-shell";
import { EmptyState } from "./components/shared";
import { Button } from "./components/ui/button";
import { DesignPage } from "./features/design/design-page";
import { EstimatePage } from "./features/estimates/estimate-page";
import { ProjectPage } from "./features/projects/project-page";
import { ProjectsPage } from "./features/projects/projects-page";
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
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
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
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/projects" replace />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectPage />} />
              <Route path="estimates/:id" element={<EstimatePage />} />
              <Route path="design-system" element={<DesignPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DemoProvider>
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

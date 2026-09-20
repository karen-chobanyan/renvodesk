import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  FolderKanban,
  Menu,
  PanelsTopLeft,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useParams, useSearchParams } from "react-router";
import { useAuthCopy } from "@/features/auth/copy";
import {
  AccountControls,
  CompanyNavigation,
} from "@/features/organizations/company-navigation";
import { useCompanyAccess } from "@/features/team/company-access";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { Button } from "./ui/button";

function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 760px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
export function AppShell({
  children,
  live = false,
  company,
  organizationId,
}: {
  children?: ReactNode;
  live?: boolean;
  company?: string;
  organizationId?: string;
}) {
  const params = useParams();
  const [search] = useSearchParams();
  const activeOrg =
    organizationId ??
    params.organizationId ??
    search.get("company") ??
    undefined;
  const { owner } = useCompanyAccess(live ? activeOrg : undefined);
  const home =
    live && activeOrg
      ? `/workspace?company=${activeOrg}`
      : live
        ? "/workspace"
        : "/projects";
  const { t, locale, setLocale } = useLocale();
  const { projects } = useDemo();
  const authText = useAuthCopy();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 760px)").matches,
    () => false,
  );
  const sidebar = (
    <aside className="sidebar sidebar-open">
      {isMobile && (
        <>
          <DialogPrimitive.Title className="sr-only">
            {t("menu")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t("workspace")}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="drawer-close button button-ghost button-icon"
            aria-label={t("close")}
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </>
      )}
      <NavLink className="brand" to={home} onClick={() => setMobileOpen(false)}>
        <span className="brand-mark">
          r<span>.</span>
        </span>
        RenvoDesk
      </NavLink>
      {live ? (
        <CompanyNavigation id={activeOrg} close={() => setMobileOpen(false)} />
      ) : (
        <div className="workspace-switch">
          <span className="company-avatar">
            {live ? company?.slice(0, 2).toUpperCase() || "R." : "AH"}
          </span>
          <div>
            <strong>
              {live ? company || authText("workspace") : t("company")}
            </strong>
            <small>{live ? authText("realData") : t("companyDetail")}</small>
          </div>
        </div>
      )}
      <p className="nav-label">{t("workspace")}</p>
      <nav aria-label={t("workspace")}>
        <NavLink
          to={home}
          end={live && !params.id}
          onClick={() => setMobileOpen(false)}
        >
          <FolderKanban size={18} />
          {t("projects")}
          {!live && (
            <span className="nav-count">
              {String(projects.length).padStart(2, "0")}
            </span>
          )}
        </NavLink>
        {live && activeOrg && owner && (
          <NavLink
            to={`/workspace/${activeOrg}/clients`}
            onClick={() => setMobileOpen(false)}
          >
            <Users size={18} />
            {locale === "fr" ? "Clients" : "Clients"}
          </NavLink>
        )}
        {live && activeOrg && (
          <NavLink
            to={`/workspace/${activeOrg}/schedule`}
            onClick={() => setMobileOpen(false)}
          >
            <CalendarDays size={18} />
            {locale === "fr" ? "Planning" : "Schedule"}
          </NavLink>
        )}
        {(!live || owner) && (
          <NavLink
            to={
              live
                ? activeOrg
                  ? `/workspace/${activeOrg}/estimates`
                  : home
                : "/estimates/maison-ixelles"
            }
            onClick={() => setMobileOpen(false)}
          >
            <FileText size={18} />
            {t("estimates")}{" "}
          </NavLink>
        )}
      </nav>
      <p className="nav-label resource-label">{t("resources")}</p>
      <nav aria-label={t("resources")}>
        <NavLink to="/design-system" onClick={() => setMobileOpen(false)}>
          <PanelsTopLeft size={18} />
          {t("design")}
        </NavLink>
      </nav>
      {live && (
        <NavLink
          className="sidebar-demo-link"
          to="/projects"
          onClick={() => setMobileOpen(false)}
        >
          {authText("demo")}
        </NavLink>
      )}
      <div className="sidebar-bottom">
        <div className="demo-label">
          <span className="live-dot" />
          {live ? authText("realData") : t("demo")}
        </div>
        <p>
          {live
            ? locale === "fr"
              ? "Projets enregistrés. Les aperçus de démonstration sont signalés."
              : "Saved projects. Demonstration previews are labeled."
            : t("demoNotice")}
        </p>
        {live && <AccountControls />}
        {!live && (
          <div className="profile">
            <span className="profile-avatar">AM</span>
            <div>
              <strong>Alex Morgan</strong>
              <small>{t("sample")}</small>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
  return (
    <DialogPrimitive.Root
      open={isMobile && mobileOpen}
      onOpenChange={setMobileOpen}
    >
      <div className={`app-shell ${live ? "live-shell" : ""}`}>
        <a className="skip-link" href="#main">
          {t("overview")}
        </a>
        {!isMobile ? (
          sidebar
        ) : (
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="sidebar-backdrop" />
            <DialogPrimitive.Content asChild>{sidebar}</DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
        <div className="main-shell">
          <div className="topbar">
            <div className="topbar-left">
              <DialogPrimitive.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mobile-menu"
                  aria-label={t("menu")}
                >
                  <Menu size={20} />
                </Button>
              </DialogPrimitive.Trigger>
              <span className="topbar-brand">
                {live ? company || "RenvoDesk" : "Atelier & Habitat"}
              </span>
              <span className="topbar-slash">/</span>
              <span className="muted">
                {t("workspace").toLocaleLowerCase(locale)}
              </span>
            </div>
            <div className="topbar-right">
              <NavLink className="account-link" to={live ? home : "/workspace"}>
                {authText("account")}
              </NavLink>
              <span className="demo-chip">
                {live ? authText("realData") : t("demo")}
              </span>
              <label className="language-picker">
                <span className="sr-only">{t("language")}</span>
                <select
                  value={locale}
                  onChange={(e) =>
                    setLocale(e.target.value === "en" ? "en" : "fr")
                  }
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
              </label>
            </div>
          </div>
          <main id="main" tabIndex={-1}>
            {children ?? <Outlet />}
          </main>
          <footer className="app-footer">
            <span>
              RenvoDesk <span className="footer-divider">/</span>{" "}
              {live ? authText("realData") : t("sample")}
            </span>
            <NavLink to="/design-system">
              {t("design")}
              <ArrowUpRight size={13} />
            </NavLink>
          </footer>
        </div>
      </div>
    </DialogPrimitive.Root>
  );
}

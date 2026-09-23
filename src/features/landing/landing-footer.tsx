import { ArrowUpRight } from "lucide-react";
import { ConsentControls } from "../../lib/telemetry/consent-controls";
import { Brand } from "./landing-brand";
import { type LandingLocale, landingCopy } from "./landing-copy";

export function LandingFooter({
  locale,
  alternateHref,
}: {
  locale: LandingLocale;
  alternateHref?: string;
}) {
  const c = landingCopy[locale];
  const home = locale === "fr" ? "/" : "/en/";
  return (
    <footer className="landing-footer">
      <div>
        <a href={home} aria-label="RenvoDesk">
          <Brand footer />
        </a>
        <p>{c.footer}</p>
      </div>
      <nav aria-label={locale === "fr" ? "Pied de page" : "Footer"}>
        <a href={locale === "fr" ? "/privacy/" : "/en/privacy/"}>
          {locale === "fr" ? "Politique de confidentialité" : "Privacy Policy"}
        </a>
        <a href={locale === "fr" ? "/terms/" : "/en/terms/"}>
          {locale === "fr" ? "Conditions d’utilisation" : "Terms of Use"}
        </a>
        <ConsentControls locale={locale} placement="footer" />
        <a href={`${home}#product`}>{c.product}</a>
        <a href="/projects">{c.demo}</a>
        <a href="/login">{c.login}</a>
        <a
          href={alternateHref ?? (locale === "fr" ? "/en/" : "/")}
          hrefLang={locale === "fr" ? "en" : "fr"}
        >
          {locale === "fr" ? "English" : "Français"}
        </a>
      </nav>
      <div className="landing-footer-bottom">
        <span>© 2026 RenvoDesk</span>
        <span>{c.footerNote}</span>
        <a href="#top">
          {c.top}
          <ArrowUpRight size={13} />
        </a>
      </div>
    </footer>
  );
}

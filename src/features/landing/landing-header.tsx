import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./landing-brand";
import { type LandingLocale, landingCopy } from "./landing-copy";

export function LandingHeader({
  locale,
  alternateHref,
}: {
  locale: LandingLocale;
  alternateHref?: string;
}) {
  const c = landingCopy[locale],
    [menuOpen, setMenuOpen] = useState(false);
  const home = locale === "fr" ? "/" : "/en/";
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document
          .querySelector<HTMLButtonElement>(".landing-menu-toggle")
          ?.focus();
      }
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [menuOpen]);
  return (
    <header className="landing-header">
      <a href={home} aria-label="RenvoDesk">
        <Brand />
      </a>
      <nav className="landing-desktop-nav" aria-label={c.menu}>
        <a href={`${home}#product`}>{c.product}</a>
        <a href={`${home}#workflow`}>{c.workflow}</a>
        <a href={`${home}#questions`}>{c.questions}</a>
      </nav>
      <div className="landing-header-actions">
        <a
          className="landing-language"
          href={alternateHref ?? (locale === "fr" ? "/en/" : "/")}
          hrefLang={locale === "fr" ? "en" : "fr"}
          aria-label={c.language}
        >
          {locale === "fr" ? "EN" : "FR"}
        </a>
        <a className="landing-login" href="/login">
          {c.login}
        </a>
        <a className="landing-button landing-button-small" href="/signup">
          {c.start}
          <ArrowUpRight size={15} />
        </a>
        <button
          type="button"
          className="landing-menu-toggle"
          aria-label={menuOpen ? c.close : c.menu}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <nav
          className="landing-mobile-nav"
          id="landing-mobile-nav"
          aria-label={c.menu}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              document
                .querySelector<HTMLButtonElement>(".landing-menu-toggle")
                ?.focus();
            }
          }}
        >
          <a href={`${home}#product`} onClick={() => setMenuOpen(false)}>
            {c.product}
          </a>
          <a href={`${home}#workflow`} onClick={() => setMenuOpen(false)}>
            {c.workflow}
          </a>
          <a href={`${home}#questions`} onClick={() => setMenuOpen(false)}>
            {c.questions}
          </a>
          <a href="/login">{c.login}</a>
        </nav>
      )}
    </header>
  );
}

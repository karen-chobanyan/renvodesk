import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ConsentControls } from "../../lib/telemetry/consent-controls";
import { type LandingLocale, landingCopy } from "./landing-copy";
import { ProjectModel } from "./project-model";

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <span className={`landing-brand${footer ? " landing-brand-footer" : ""}`}>
      <span className="landing-brand-mark">
        r<span>.</span>
      </span>
      RenvoDesk
    </span>
  );
}
export function LandingPage({ locale }: { locale: LandingLocale }) {
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
    <div className="landing" id="top">
      <a className="landing-skip" href="#landing-main">
        {c.skip}
      </a>
      <header className="landing-header">
        <a href={home} aria-label="RenvoDesk">
          <Brand />
        </a>
        <nav className="landing-desktop-nav" aria-label={c.menu}>
          <a href="#product">{c.product}</a>
          <a href="#workflow">{c.workflow}</a>
          <a href="#questions">{c.questions}</a>
        </nav>
        <div className="landing-header-actions">
          <a
            className="landing-language"
            href={locale === "fr" ? "/en/" : "/"}
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
            {/* biome-ignore lint/a11y/useValidAnchor: native fragment navigation also dismisses the mobile menu */}
            <a href="#product" onClick={() => setMenuOpen(false)}>
              {c.product}
            </a>
            {/* biome-ignore lint/a11y/useValidAnchor: native fragment navigation also dismisses the mobile menu */}
            <a href="#workflow" onClick={() => setMenuOpen(false)}>
              {c.workflow}
            </a>
            {/* biome-ignore lint/a11y/useValidAnchor: native fragment navigation also dismisses the mobile menu */}
            <a href="#questions" onClick={() => setMenuOpen(false)}>
              {c.questions}
            </a>
            <a href="/login">{c.login}</a>
          </nav>
        )}
      </header>
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <span />
                {c.eyebrow}
              </p>
              <h1 id="hero-title">
                {c.headline[0]}
                <br />
                <span>{c.headline[1]}</span>
              </h1>
              <p className="landing-hero-intro">{c.intro}</p>
              <div className="landing-hero-actions">
                <a className="landing-button" href="/signup">
                  {c.start}
                  <ArrowUpRight size={18} />
                </a>
                <a className="landing-text-link" href="/projects">
                  {c.demo}
                  <ArrowRight size={17} />
                </a>
              </div>
              <p className="landing-demo-note">{c.demoNote}</p>
            </div>
            <ApplicationScreenshot locale={locale} screen="overview" eager />
          </div>
        </section>
        <section
          className="landing-product landing-section"
          id="product"
          aria-labelledby="product-title"
        >
          <div className="landing-section-heading">
            <div>
              <p className="landing-eyebrow">{c.featureEyebrow}</p>
              <h2 id="product-title">{c.featureTitle}</h2>
            </div>
            <p>{c.featureIntro}</p>
          </div>
          <div className="landing-screenshot-features">
            {(["estimate", "tasks", "budget"] as const).map((screen, index) => (
              <article className="landing-feature-row" key={screen}>
                <div className="landing-feature-copy">
                  <p className="landing-eyebrow">
                    {c.screenshots.labels[index]}
                  </p>
                  <h3>{c.screenshots.titles[index]}</h3>
                  <p>{c.screenshots.descriptions[index]}</p>
                </div>
                <ApplicationScreenshot locale={locale} screen={screen} />
              </article>
            ))}
          </div>
        </section>
        <section
          className="landing-process landing-section"
          id="workflow"
          aria-labelledby="workflow-title"
        >
          <div className="landing-process-heading">
            <p className="landing-eyebrow">{c.processEyebrow}</p>
            <h2 id="workflow-title">{c.processTitle}</h2>
            <a className="landing-text-link" href="/projects">
              {c.demo}
              <ArrowUpRight size={18} />
            </a>
            <ProjectModel locale={locale} />
          </div>
          <ol>
            {c.steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <ArrowDown size={18} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>
        <section className="landing-site" aria-labelledby="site-title">
          <div className="landing-site-visual">
            <img
              className="landing-site-photo"
              src="/images/renovation-interior.jpg"
              width="1536"
              height="1024"
              alt={c.siteAlt}
              loading="lazy"
              decoding="async"
            />
            <p className="landing-image-caption">{c.imageCaption}</p>
          </div>
          <div className="landing-site-copy">
            <p className="landing-eyebrow">{c.siteEyebrow}</p>
            <h2 id="site-title">{c.siteTitle}</h2>
            <p>{c.siteText}</p>
            <a className="landing-text-link" href="/projects">
              {c.siteLink}
              <ArrowUpRight size={18} />
            </a>
            <span className="landing-device-note">
              <FileText size={16} />
              {c.devices}
            </span>
          </div>
        </section>
        <section
          className="landing-faq landing-section"
          id="questions"
          aria-labelledby="faq-title"
        >
          <div>
            <p className="landing-eyebrow">{c.faqEyebrow}</p>
            <h2 id="faq-title">{c.faqTitle}</h2>
          </div>
          <div>
            {c.faq.map((item) => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <ChevronDown size={17} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="landing-cta" aria-labelledby="cta-title">
          <div className="landing-cta-grid" aria-hidden="true" />
          <div>
            <p className="landing-eyebrow">{c.ctaEyebrow}</p>
            <h2 id="cta-title">{c.ctaTitle}</h2>
            <p>{c.ctaText}</p>
            <a className="landing-button landing-button-light" href="/signup">
              {c.start}
              <ArrowUpRight size={19} />
            </a>
          </div>
          <span className="landing-cta-monogram" aria-hidden="true">
            r.
          </span>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <a href={home} aria-label="RenvoDesk">
            <Brand footer />
          </a>
          <p>{c.footer}</p>
        </div>
        <nav aria-label={locale === "fr" ? "Pied de page" : "Footer"}>
          <a href={locale === "fr" ? "/privacy" : "/en/privacy"}>
            {locale === "fr" ? "Confidentialité" : "Privacy"}
          </a>
          <a href="#product">{c.product}</a>
          <a href="/projects">{c.demo}</a>
          <a href="/login">{c.login}</a>
          <a
            href={locale === "fr" ? "/en/" : "/"}
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
      <ConsentControls locale={locale} />
    </div>
  );
}

function ApplicationScreenshot({
  locale,
  screen,
  eager = false,
}: {
  locale: LandingLocale;
  screen: "overview" | "estimate" | "tasks" | "budget";
  eager?: boolean;
}) {
  const c = landingCopy[locale].screenshots;
  const src = `/images/product/${screen}-${locale}.png`;
  return (
    <figure className="landing-app-shot">
      <a href={src} target="_blank" rel="noreferrer" aria-label={c[screen]}>
        <img
          src={src}
          alt={c[screen]}
          width="1440"
          height="1000"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
        />
      </a>
      <figcaption>{c.caption}</figcaption>
    </figure>
  );
}

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
} from "lucide-react";
import { type LandingLocale, landingCopy } from "./landing-copy";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { ProjectModel } from "./project-model";

export function LandingPage({ locale }: { locale: LandingLocale }) {
  const c = landingCopy[locale];
  return (
    <div className="landing" id="top">
      <a className="landing-skip" href="#landing-main">
        {c.skip}
      </a>
      <LandingHeader locale={locale} />
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
      <LandingFooter locale={locale} />
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

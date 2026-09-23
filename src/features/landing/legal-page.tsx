import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { type LegalKind, legalCopy } from "./legal-copy";
import "./legal.css";

export function LegalPage({
  locale,
  kind,
}: {
  locale: "fr" | "en";
  kind: LegalKind;
}) {
  const en = locale === "en";
  const document = legalCopy[locale][kind];
  const operator =
    import.meta.env.VITE_PRIVACY_OPERATOR?.trim() || "Chobanyan Solutions";
  const email =
    import.meta.env.VITE_PRIVACY_EMAIL?.trim() || "contact@renvodesk.com";
  const address =
    import.meta.env.VITE_LEGAL_ADDRESS?.trim() ||
    "Rue du Bauloy 81 · 1340 Ottignies-Louvain-la-Neuve";
  const country =
    import.meta.env.VITE_LEGAL_COUNTRY?.trim() || (en ? "Belgium" : "Belgique");
  const registration = import.meta.env.VITE_LEGAL_REGISTRATION?.trim();
  const complete = !!(operator && email && address && country);
  return (
    <div className="landing legal-page" id="top">
      <a className="landing-skip" href="#legal-content">
        {en ? "Skip to content" : "Aller au contenu"}
      </a>
      <LandingHeader
        locale={locale}
        alternateHref={`${en ? "" : "/en"}/${kind}/`}
      />
      <main id="legal-content" className="legal-main">
        <div className="legal-intro">
          <p className="landing-eyebrow">
            RENVODESK / {en ? "LEGAL INFORMATION" : "INFORMATIONS JURIDIQUES"}
          </p>
          <h1>{document.title}</h1>
          <p>{document.intro}</p>
          <p className="legal-date">
            {en ? "Last updated: " : "Dernière mise à jour : "}
            <time dateTime="2026-09-23">
              {en ? "23 September 2026" : "23 septembre 2026"}
            </time>
          </p>
          {!complete && (
            <aside
              className="legal-draft"
              aria-label={en ? "Publication status" : "Statut de publication"}
            >
              <strong>
                {en
                  ? "Draft — operator details pending"
                  : "Projet — coordonnées de l’exploitant à compléter"}
              </strong>
              <p>
                {en
                  ? "The policy text is provided below. The operator’s legal identity, address, country and contact must be completed, and actual provider arrangements verified, before publication as final legal notices."
                  : "Le texte figure ci-dessous. L’identité légale, l’adresse, le pays et le contact de l’exploitant doivent être complétés, et les accords effectifs avec les prestataires vérifiés, avant publication comme mentions définitives."}
              </p>
            </aside>
          )}
        </div>
        <div className="legal-layout">
          <nav
            className="legal-contents"
            aria-label={en ? "On this page" : "Sur cette page"}
          >
            <p>{en ? "ON THIS PAGE" : "SUR CETTE PAGE"}</p>
            {document.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
            <a href="#operator">
              {en ? "Operator and contact" : "Exploitant et contact"}
            </a>
          </nav>
          <article className="legal-body">
            {document.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`heading-${section.id}`}
              >
                <h2 id={`heading-${section.id}`}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            <section id="operator" aria-labelledby="operator-heading">
              <h2 id="operator-heading">
                {en ? "Operator and contact" : "Exploitant et contact"}
              </h2>
              <dl className="legal-operator">
                <dt>Service</dt>
                <dd>RenvoDesk · renvodesk.com</dd>
                {operator && (
                  <>
                    <dt>{en ? "Legal operator" : "Exploitant légal"}</dt>
                    <dd>{operator}</dd>
                  </>
                )}
                {address && (
                  <>
                    <dt>
                      {en ? "Business address" : "Adresse professionnelle"}
                    </dt>
                    <dd>{address}</dd>
                  </>
                )}
                {country && (
                  <>
                    <dt>{en ? "Country" : "Pays"}</dt>
                    <dd>{country}</dd>
                  </>
                )}
                {registration && (
                  <>
                    <dt>
                      {en ? "Registration / VAT" : "Immatriculation / TVA"}
                    </dt>
                    <dd>{registration}</dd>
                  </>
                )}
                {email && (
                  <>
                    <dt>Contact</dt>
                    <dd>
                      <a href={`mailto:${email}`}>{email}</a>
                    </dd>
                  </>
                )}
              </dl>
              {!complete && (
                <p>
                  {en
                    ? "The operator identification above is incomplete. No unverified company identity or email address has been substituted."
                    : "L’identification de l’exploitant ci-dessus est incomplète. Aucune identité d’entreprise ni adresse e-mail non vérifiée n’a été substituée."}
                </p>
              )}
            </section>
            {kind === "privacy" && (
              <section aria-labelledby="provider-heading">
                <h2 id="provider-heading">
                  {en
                    ? "Provider notices and supervisory authorities"
                    : "Notices des prestataires et autorités de contrôle"}
                </h2>
                <ul>
                  <li>
                    <a href="https://supabase.com/privacy">Supabase</a>
                  </li>
                  <li>
                    <a href="https://policies.google.com/privacy">Google</a>
                  </li>
                  <li>
                    <a href="https://sentry.io/privacy/">Sentry</a>
                  </li>
                  <li>
                    <a href="https://www.autoriteprotectiondonnees.be/citoyen/agir/introduire-une-plainte">
                      {en
                        ? "Belgian Data Protection Authority — complaints"
                        : "Autorité de protection des données belge — réclamations"}
                    </a>
                  </li>
                  <li>
                    <a href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en">
                      {en
                        ? "European data protection authorities"
                        : "Autorités européennes de protection des données"}
                    </a>
                  </li>
                </ul>
              </section>
            )}
          </article>
        </div>
      </main>
      <LandingFooter
        locale={locale}
        alternateHref={`${en ? "" : "/en"}/${kind}/`}
      />
    </div>
  );
}

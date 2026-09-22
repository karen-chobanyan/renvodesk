import { ConsentControls } from "../../lib/telemetry/consent-controls";
export function PrivacyPage({ locale }: { locale: "fr" | "en" }) {
  const en = locale === "en";
  const operator = import.meta.env.VITE_PRIVACY_OPERATOR;
  const contact = import.meta.env.VITE_PRIVACY_EMAIL;
  return (
    <div className="landing">
      <main className="privacy-information">
        <a href={en ? "/en/" : "/"}>← RenvoDesk</a>
        <h1>
          {en
            ? "Privacy and optional tracking"
            : "Confidentialité et suivi optionnel"}
        </h1>
        <p>
          {en
            ? "This page explains the optional measurement tools used by RenvoDesk. These tools are not required to use the application."
            : "Cette page décrit les outils de mesure optionnels de RenvoDesk. Ils ne sont pas nécessaires pour utiliser l’application."}
        </p>
        <h2>{en ? "Your choices" : "Vos choix"}</h2>
        <p>
          {en
            ? "Analytics and error reporting are disabled until you choose to allow them. Use Privacy settings at the bottom of any page to change your choices. Your preference is stored in this browser for 180 days. If browser storage is unavailable, it applies only to the current page session. Withdrawing consent stops future collection; it does not erase data already sent."
            : "Les statistiques et rapports d’erreurs sont désactivés jusqu’à votre accord. Utilisez Confidentialité en bas de chaque page pour modifier vos choix. Votre préférence est conservée dans ce navigateur pendant 180 jours. Si le stockage est indisponible, elle s’applique uniquement à la page en cours. Le retrait arrête la collecte future, sans effacer les données déjà envoyées."}
        </p>
        <h2>Google Analytics 4</h2>
        <p>
          {en
            ? "With your permission, Google receives a browser identifier stored in analytics cookies, generic page names, language and selected actions such as creating a project. We do not send customer names, project names, document contents or financial amounts. Google receives network information when requests reach its servers. Advertising features are disabled. Reporting covers consenting browsers and is not a complete record of all users."
            : "Avec votre accord, Google reçoit un identifiant de navigateur conservé dans des cookies, des noms de pages génériques, la langue et certaines actions comme la création d’un projet. Nous n’envoyons pas de noms de clients ou de projets, de documents ni de montants financiers. Google reçoit des informations réseau lors des requêtes. Les fonctions publicitaires sont désactivées. Les rapports couvrent les navigateurs consentants et ne constituent pas un historique exhaustif."}
        </p>
        <a href="https://policies.google.com/privacy">
          {en
            ? "Google privacy policy"
            : "Politique de confidentialité de Google"}
        </a>
        <h2>Sentry</h2>
        <p>
          {en
            ? "If enabled, technical errors go to our Sentry project in Germany. Reports contain generic error types, static application file locations and page categories. Error messages, form values, request bodies and browsing breadcrumbs are removed. Session replay and performance tracing are disabled. The service still receives network information when a report is sent."
            : "Si vous l’autorisez, les erreurs techniques sont envoyées à notre projet Sentry en Allemagne. Les rapports contiennent des types d’erreurs génériques, les emplacements de fichiers statiques de l’application et des catégories de pages. Les messages d’erreur, formulaires, corps de requêtes et historiques de navigation sont retirés. L’enregistrement des sessions et le traçage des performances sont désactivés. Le service reçoit toutefois des informations réseau lors de l’envoi."}
        </p>
        <a href="https://sentry.io/privacy/">
          {en
            ? "Sentry privacy policy"
            : "Politique de confidentialité de Sentry"}
        </a>
        <h2>
          {en
            ? "Application data and contact"
            : "Données de l’application et contact"}
        </h2>
        <p>
          {en
            ? "Account sessions and saved project records are separate from optional tracking. Rejecting tracking does not disable authentication, saved work or the project activity journal."
            : "Les sessions de compte et les données de projet sont distinctes du suivi optionnel. Refuser le suivi ne désactive ni l’authentification, ni l’enregistrement des travaux, ni le journal du projet."}
        </p>
        {operator && contact ? (
          <p>
            {operator} · <a href={`mailto:${contact}`}>{contact}</a>
          </p>
        ) : (
          <p>
            {en
              ? "Preview notice: the operator’s legal details and privacy contact must be completed before public launch. This page does not yet replace the complete service privacy notice."
              : "Information de préversion : les mentions de l’exploitant et le contact confidentialité doivent être complétés avant le lancement public. Cette page ne remplace pas encore la politique de confidentialité complète du service."}
          </p>
        )}
      </main>
      <ConsentControls locale={locale} />
    </div>
  );
}

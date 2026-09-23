export type LegalKind = "terms" | "privacy";
export type LegalSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
};
export type LegalDocument = {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
};
export const legalCopy: Record<
  "fr" | "en",
  Record<LegalKind, LegalDocument>
> = {
  en: {
    terms: {
      title: "Terms of Use",
      intro:
        "These terms describe the conditions for using RenvoDesk, a web application for renovation contractors and their teams. They cover the public website, demonstration and saved workspaces.",
      sections: [
        {
          id: "scope",
          title: "1. Who the service is for",
          paragraphs: [
            "RenvoDesk is intended for professional renovation businesses and authorised team members aged 18 or over. If you use it on behalf of a business, you must have authority to act for that business. The operator’s identification and contact details appear below.",
            "These terms govern use of the service together with any specific agreement concluded with the operator. A specific agreement takes priority where it expressly changes these terms. Viewing these pages is not recorded as contractual acceptance.",
          ],
        },
        {
          id: "service",
          title: "2. What RenvoDesk provides",
          paragraphs: [
            "The service helps organise clients, properties, projects, estimates, tasks, cost budgets, expenses, files, sketches and project activity. Available features and access depend on your role. Demonstration records are fictional, separate from saved workspaces and may reset on reload.",
            "RenvoDesk is a management tool, not a construction, engineering, legal, tax or accounting adviser. You remain responsible for measurements, site safety, permits, prices, contracts and compliance with applicable rules. Sketches are not certified or measured CAD plans.",
            "Recording an estimate as sent, accepted or declined records an owner’s statement; it does not establish email delivery, an electronic signature or independent customer approval. Estimate PDFs are not invoices. Invoicing, payments, tax compliance and offline synchronisation are not currently provided.",
          ],
        },
        {
          id: "accounts",
          title: "3. Accounts and team access",
          paragraphs: [
            "Provide accurate account information, protect your login credentials and use an individual account rather than sharing a password. Notify the operator if you believe an account has been compromised.",
            "Company owners manage invitations and membership. Invite only authorised people, verify intended recipients and remove access when it is no longer needed. Members may view operational project information and edit tasks assigned to them; financial and administrative functions are reserved for owners. Removing access does not automatically remove historical project records.",
          ],
        },
        {
          id: "content",
          title: "4. Your content and responsibilities",
          paragraphs: [
            "You retain your rights in the information and files you add. You grant the operator only the permission needed to host, store, process and display that content to provide the service, maintain security and respond to authorised support requests. These terms do not transfer ownership of your project content.",
            "You are responsible for having a lawful basis and the necessary permissions to add personal data, drawings, photos, recordings and other material. Inform affected customers, workers and other individuals where required. Upload only information relevant to your business work and avoid unnecessary sensitive personal data.",
            "Review saved figures and exported documents before relying on or sharing them. Keep your original business records and any independent copies required for your work. An upload retry is not a guarantee of offline storage or a complete backup service.",
          ],
        },
        {
          id: "acceptable-use",
          title: "5. Acceptable use",
          paragraphs: [
            "Do not use the service unlawfully, impersonate others, infringe intellectual property or privacy rights, upload malicious content, distribute credentials, or attempt to access another company’s records without authorisation.",
            "Do not bypass access controls, interfere with service availability, or conduct intrusive security testing without permission. Report suspected vulnerabilities privately through the operator’s contact details rather than exploiting them or accessing other users’ data.",
          ],
        },
        {
          id: "privacy",
          title: "6. Privacy and optional tracking",
          paragraphs: [
            "The Privacy Policy explains how personal data is handled and how to exercise privacy rights. It is an information notice, not consent to processing or a waiver of rights. Optional analytics and technical error reporting require separate consent. Refusing or withdrawing that consent does not disable the core application.",
            "A business that uploads customer or employee data remains responsible for its own data protection obligations. Where the operator processes that data on the business’s behalf, an appropriate data processing agreement is required. These terms and the Privacy Policy do not replace that agreement.",
          ],
        },
        {
          id: "fees",
          title: "7. Fees and future paid services",
          paragraphs: [
            "These terms do not establish a subscription price or authorise a payment. No automatic subscription purchase or payment collection is currently implemented in the application.",
            "Any future paid offer must separately explain its price, taxes, billing interval, renewal, cancellation and refund conditions before you agree to it. Using the current service does not itself authorise future charges.",
          ],
        },
        {
          id: "availability",
          title: "8. Availability and changes",
          paragraphs: [
            "The service depends on an internet connection and third-party infrastructure. Maintenance, updates and incidents may interrupt access. No guaranteed uptime or recovery time is established by these terms.",
            "Features may evolve. Material changes affecting an agreed service will be communicated as appropriate. Do not rely on proposed or advertised future functionality as though it were already available.",
          ],
        },
        {
          id: "ownership",
          title: "9. Application intellectual property",
          paragraphs: [
            "The operator or its licensors retain rights in the application, branding and original website materials. Subject to these terms, you may use the service for your authorised business activities. Rights in third-party and open-source components remain governed by their own licences.",
            "You may not present RenvoDesk as your own product or reuse its branding in a way that suggests an unauthorised affiliation. This does not limit rights granted by applicable law or an applicable open-source licence.",
          ],
        },
        {
          id: "ending",
          title: "10. Suspension and ending use",
          paragraphs: [
            "You may stop using the service and request account closure through the operator. Self-service account closure, complete workspace export and automatic project deletion are not currently available. Requests must take account of the company’s authority over shared records and applicable retention duties.",
            "Access may be restricted where reasonably necessary to address unlawful use, a material breach, a security threat or a legal obligation. Where practicable and lawful, the operator will explain the reason and allow an opportunity to resolve the issue. Urgent protection may require immediate action.",
          ],
        },
        {
          id: "liability",
          title: "11. Responsibility and disputes",
          paragraphs: [
            "Each party remains responsible for its obligations under applicable law. RenvoDesk does not guarantee a project’s profitability, construction outcome or legal compliance. Decisions about building work and customer agreements remain with the business and its qualified advisers.",
            "Nothing in these terms excludes liability or removes rights that cannot lawfully be excluded, including any mandatory consumer protections that apply despite the service’s professional purpose. In particular, these terms do not exclude liability for intentional misconduct, gross negligence or failure to perform essential contractual obligations where such exclusion is unlawful. No contractual monetary liability cap is introduced here.",
            "You are invited to raise a dispute with the operator so that it can be reviewed. This is not a prerequisite to seeking a legal remedy, urgent relief or contacting a supervisory authority. Applicable law and the competent courts are determined by the relevant legal rules and any valid specific agreement; these terms do not impose an exclusive forum or waive mandatory rights.",
          ],
        },
        {
          id: "updates",
          title: "12. Updates and contact",
          paragraphs: [
            "The date above identifies this version. Material revisions will be communicated through an appropriate channel and will not retroactively remove accrued rights. Where renewed agreement is required, it must be obtained separately.",
            "Use the operator contact details below for questions about these terms, account closure or the service.",
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      intro:
        "This policy explains the personal data handled when you visit RenvoDesk or use a workspace, why it is needed, who may receive it and the choices available to you.",
      sections: [
        {
          id: "roles",
          title: "1. Who is responsible for your data",
          paragraphs: [
            "The operator identified below is responsible for personal data used to manage its own website, business relationships, accounts, security and optional measurement. The operator and privacy contact are identified in the Operator and contact section below.",
            "For customer, worker and other personal data entered into a company workspace, the company generally determines the purposes of processing and acts as controller. The operator processes that workspace data on its behalf to provide the service. That relationship requires a separate data processing agreement.",
            "If your information was added by a renovation company, that company is normally responsible for requests about the project record. You may also contact the operator for help identifying the responsible company or forwarding your request. This does not restrict your rights or the operator’s own obligations.",
          ],
        },
        {
          id: "data",
          title: "2. Data collected and its sources",
          paragraphs: [
            "Account and company data includes email address, authentication/session information, company name, country, membership role, invitations and optional business contact details. It comes from you, the person inviting you or your company administrator.",
            "Workspace data may include client contact and billing details, property addresses, project descriptions, estimates, tasks, assignments, expenses, notes, photos, voice recordings, files, sketches and activity records identifying who performed an action. It comes from authorised workspace users. Files may contain personal data or metadata supplied by their authors.",
            "Technical services receive network information such as IP address, browser/request information and timestamps when handling a connection. Optional analytics and error-reporting data are described below. Payment-card collection and automated invoicing are not implemented.",
          ],
        },
        {
          id: "purposes",
          title: "3. Purposes and legal bases",
          paragraphs: [
            "Account administration and service delivery use data needed to perform a contract with you, or steps requested before entering it, where you are the contracting individual. For company representatives and team members, the relevant basis is the legitimate interest in administering the business relationship and providing authorised access, subject to their rights.",
            "Security, abuse prevention, service integrity and handling enquiries rely on legitimate interests in operating a dependable service, or a legal obligation where one applies. Information required to establish, exercise or defend legal claims may be retained for that purpose.",
            "Optional Google Analytics and Sentry collection relies on your separate consent. Workspace processing on a company’s instructions follows the company’s purposes, lawful basis and applicable processing agreement; the operator does not choose an independent marketing purpose for that content.",
            "An account email and the information needed for a requested operation are necessary to provide that function. Optional contact fields and measurement consent are not required to use core features. Refusing optional tracking does not reduce your workspace permissions.",
          ],
        },
        {
          id: "storage",
          title: "4. Browser storage and consent controls",
          paragraphs: [
            "Storage inventory (version 2026-09-23): RenvoDesk uses the following first-party browser storage for the purposes described here. Browser storage and provider-side retention are different; clearing one does not erase the other.",
            "Necessary preference storage: renvodesk-privacy-v1 (local storage) records analytics/diagnostics choices and their date for RenvoDesk. Choices are valid for 180 days; the browser entry itself may remain until replaced or cleared. renvodesk-locale (local storage) remembers French or English until changed or cleared, with no automatic expiry.",
            "Authentication storage: sb-<project-ref>-auth-token (local storage) holds the Supabase session needed for signed-in features. RenvoDesk and Supabase use it to maintain authenticated access; it persists until sign-out, session cleanup or browser clearing. Token expiry and refresh are controlled by the authentication service. Related *-code-verifier entries, including per-flow entries and their index, support secure signup and recovery callbacks. Completed flows are cleaned up by the authentication library; abandoned entries may remain until library cleanup or browser clearing, without a browser expiry timer.",
            "Optional analytics cookies: _ga and _ga_<measurement-id> identify a browser and maintain analytics session information for Google Analytics. They are placed only with analytics consent, with a configured maximum lifetime of 180 days and automatic cookie renewal disabled. RenvoDesk removes these cookies when analytics consent is withdrawn. Google receives the associated analytics data.",
            "Optional diagnostics: the configured Sentry integration sends error reports after diagnostics consent and does not intentionally set a diagnostics cookie or persistent browser identifier. Session replay and performance tracing are disabled. Sentry receives error data as described below. This inventory covers the application integration; changes to providers or integrations require a renewed inventory review.",
            "Browser storage keeps the login session, interface language and your privacy preferences. These support authentication, your chosen language and remembering your decisions. Signing out or clearing browser storage affects the corresponding stored information.",
            "Analytics and diagnostics are off until you opt in. The Cookie Settings control on enabled production pages lets you accept, reject or choose them separately and change your decision later. Your preference expires after 180 days. If browser storage is unavailable, it applies only to the current page session.",
            "Withdrawing consent stops future optional collection and removes the application’s Google Analytics cookies. It does not reverse processing already lawfully performed. Requests already sent cannot be recalled; deletion rights remain available where applicable.",
          ],
        },
        {
          id: "analytics",
          title: "5. Optional analytics and diagnostics",
          paragraphs: [
            "Google Analytics 4 measures generic page categories, language and selected actions, such as creating a project or saving an estimate. It uses a consented browser identifier in analytics cookies, configured for up to 180 days. Application events exclude customer names, project names, financial amounts, document contents and record identifiers. Full application URLs, query strings and authentication tokens are not intentionally sent.",
            "Sentry receives technical error reports if you enable diagnostics. Reports are restricted to generic error types, static application file locations, line/column information, page category and an optional software release identifier. Raw error messages, user details, request bodies, form values and navigation breadcrumbs are removed. The configured Sentry project is in Germany.",
            "Session replay, advertising tracking and performance tracing are not enabled by this integration. Both providers still receive network information when a request reaches them. These reports concern consenting browsers and are not an exhaustive record of users or company activity.",
          ],
        },
        {
          id: "recipients",
          title: "6. Who can receive data",
          paragraphs: [
            "Authorised people in your company can access records according to their roles. Owners have administrative and financial access; members have operational project access and may edit assigned tasks. Information you download and share outside RenvoDesk is then handled by the recipients you choose.",
            "Technical providers include Supabase for authentication, database and private file storage, the VPS hosting provider for website delivery, and Google Analytics and Sentry when you consent. The website’s VPS is located in Paris, France. The configured Supabase project is in Frankfurt. Provider staff or subprocessors may have access where needed for their contracted operations and support.",
            "Data may also be disclosed where required by law, to protect legal rights or to professional advisers subject to appropriate confidentiality. The actual VPS provider, processing agreements and remaining infrastructure retention settings must be verified by the operator before final publication of this notice.",
          ],
        },
        {
          id: "transfers",
          title: "7. Processing locations and international transfers",
          paragraphs: [
            "An EU database or error-reporting region does not mean every related service activity is confined to the EEA. Provider support, subprocessors and Google services may involve processing in other countries.",
            "Transfers outside the EEA must use a lawful mechanism where required, such as an applicable adequacy decision or Standard Contractual Clauses with any necessary supplementary safeguards. The operator must confirm the mechanisms that apply to its actual provider agreements. You may request information about the safeguards and how to obtain a copy through the privacy contact below.",
          ],
        },
        {
          id: "retention",
          title: "8. Retention and deletion",
          paragraphs: [
            "Account and workspace information is retained while needed to provide the requested service and maintain authorised business records. Retention decisions take account of the active relationship, the company’s instructions, the purpose of the record, applicable legal duties and any ongoing dispute or security investigation.",
            "Removing membership, revoking an invitation or voiding an expense does not automatically erase related activity history. Some deleted or voided records leave a historical entry. There is currently no automatic account-deletion or whole-project-erasure workflow; requests need to be reviewed through the operator and, where appropriate, the workspace company. The absence of a self-service tool does not remove an applicable right to erasure or extend a legal response deadline.",
            "Privacy choices and the application’s analytics cookies use the 180-day periods described above. Google Analytics user-level and event-level retention is configured to two months, with reset on new user activity disabled. Google deletes expired data through its monthly deletion process; this setting does not apply to standard aggregated reports. Sentry error events on the Developer plan have a standard retention period of 30 days. Cookie expiry does not erase data already received by either provider. Infrastructure log retention and backup deletion arrangements still need confirmation before this notice is finalised. Data subject to an applicable legal retention obligation may be kept for that obligation and restricted from unrelated use.",
          ],
        },
        {
          id: "security",
          title: "9. Security and your responsibilities",
          paragraphs: [
            "The application uses authenticated access, company-scoped database permissions and private file storage. Team roles limit available actions. These measures reduce risk but do not make any online service completely secure.",
            "Protect account credentials, review company access and obtain the necessary permissions before uploading personal information, photos or recordings. Avoid unnecessary sensitive data. The service is intended for professional adults, not for children.",
          ],
        },
        {
          id: "rights",
          title: "10. Your rights",
          paragraphs: [
            "Depending on the circumstances and applicable law, you may request access, correction, erasure, restriction and portability of your personal data. You may object to processing based on legitimate interests and withdraw optional consent without affecting earlier lawful processing.",
            "Contact the operator using the details below, or the company responsible for your workspace record. Identity or authority may need to be verified proportionately. GDPR requests are normally answered within one month; an extension of up to two further months is permitted where necessary because of the complexity or number of requests, with notice and reasons within the first month. Requests are normally free of charge. Any lawful refusal or fee must be explained, with information about complaint and judicial remedies.",
            "You may complain to a competent data protection supervisory authority, including in the EEA country where you live or work or where an alleged infringement occurred. You do not need to contact the operator before exercising that right.",
          ],
        },
        {
          id: "automation",
          title: "11. Automated decisions",
          paragraphs: [
            "RenvoDesk does not use the described analytics or project functions to make solely automated decisions with legal or similarly significant effects on individuals. Calculated totals and project summaries assist users; they do not replace the business’s decisions.",
          ],
        },
        {
          id: "changes",
          title: "12. Changes and further information",
          paragraphs: [
            "This policy is dated above and will be revised when relevant practices change. Material changes will be brought to your attention where required. A new optional purpose requiring consent must not be activated merely by changing this policy.",
            "Use the contact details below for privacy questions. Provider privacy notices and the supervisory-authority directory are linked at the end of this page.",
          ],
        },
      ],
    },
  },
  fr: {
    terms: {
      title: "Conditions d’utilisation",
      intro:
        "Ces conditions définissent l’utilisation de RenvoDesk, une application web destinée aux entreprises de rénovation et à leurs équipes. Elles couvrent le site public, la démonstration et les espaces de travail enregistrés.",
      sections: [
        {
          id: "scope",
          title: "1. À qui s’adresse le service",
          paragraphs: [
            "RenvoDesk s’adresse aux professionnels de la rénovation et aux membres autorisés de leurs équipes âgés d’au moins 18 ans. Si vous agissez pour une entreprise, vous devez être habilité à le faire. L’identité et les coordonnées de l’exploitant figurent ci-dessous.",
            "Ces conditions encadrent l’utilisation du service avec tout accord particulier conclu avec l’exploitant. Un accord particulier prévaut lorsqu’il modifie expressément ces conditions. La simple consultation de ces pages n’est pas enregistrée comme une acceptation contractuelle.",
          ],
        },
        {
          id: "service",
          title: "2. Ce que propose RenvoDesk",
          paragraphs: [
            "Le service aide à organiser clients, biens, projets, devis, tâches, budgets de coûts, dépenses, fichiers, croquis et journal des projets. Les fonctions et accès dépendent de votre rôle. Les données de démonstration sont fictives, distinctes des espaces enregistrés et peuvent être réinitialisées au rechargement.",
            "RenvoDesk est un outil de gestion, et non un conseiller en construction, ingénierie, droit, fiscalité ou comptabilité. Vous restez responsable des mesures, de la sécurité du chantier, des autorisations, des prix, des contrats et du respect des règles applicables. Les croquis ne sont pas des plans de CAO mesurés ou certifiés.",
            "Marquer un devis comme envoyé, accepté ou refusé consigne une déclaration du propriétaire ; cela ne prouve ni la remise d’un e-mail, ni une signature électronique, ni une approbation indépendante du client. Les PDF de devis ne sont pas des factures. La facturation, les paiements, la conformité fiscale et la synchronisation hors ligne ne sont pas actuellement proposés.",
          ],
        },
        {
          id: "accounts",
          title: "3. Comptes et accès de l’équipe",
          paragraphs: [
            "Fournissez des informations exactes, protégez vos identifiants et utilisez un compte individuel plutôt qu’un mot de passe partagé. Informez l’exploitant si vous soupçonnez la compromission d’un compte.",
            "Les propriétaires d’entreprise gèrent les invitations et les membres. Invitez uniquement des personnes autorisées, vérifiez les destinataires et retirez les accès devenus inutiles. Les membres consultent les informations opérationnelles et modifient les tâches qui leur sont attribuées ; les fonctions financières et administratives sont réservées aux propriétaires. Le retrait d’un accès ne supprime pas automatiquement l’historique des projets.",
          ],
        },
        {
          id: "content",
          title: "4. Vos contenus et responsabilités",
          paragraphs: [
            "Vous conservez vos droits sur les informations et fichiers ajoutés. Vous accordez à l’exploitant uniquement les autorisations nécessaires pour héberger, stocker, traiter et afficher ces contenus afin de fournir le service, assurer sa sécurité et répondre aux demandes d’assistance autorisées. Ces conditions ne transfèrent pas la propriété de vos contenus.",
            "Vous devez disposer d’une base légale et des autorisations nécessaires pour ajouter des données personnelles, plans, photos, enregistrements ou autres documents. Informez les clients, travailleurs et autres personnes concernés lorsque cela est requis. Limitez les contenus aux besoins professionnels et évitez les données sensibles inutiles.",
            "Vérifiez les montants enregistrés et les documents exportés avant de les utiliser ou de les partager. Conservez les originaux et les copies indépendantes nécessaires à votre activité. La reprise d’un téléversement ne garantit ni un stockage hors ligne ni un service complet de sauvegarde.",
          ],
        },
        {
          id: "acceptable-use",
          title: "5. Utilisations autorisées",
          paragraphs: [
            "N’utilisez pas le service illégalement, pour usurper une identité, porter atteinte aux droits de propriété intellectuelle ou à la vie privée, téléverser des contenus malveillants, diffuser des identifiants ou accéder sans autorisation aux données d’une autre entreprise.",
            "Ne contournez pas les contrôles d’accès, ne perturbez pas la disponibilité du service et ne réalisez pas de tests de sécurité intrusifs sans autorisation. Signalez confidentiellement les vulnérabilités présumées à l’exploitant plutôt que de les exploiter ou d’accéder aux données d’autrui.",
          ],
        },
        {
          id: "privacy",
          title: "6. Confidentialité et suivi optionnel",
          paragraphs: [
            "La Politique de confidentialité explique le traitement des données personnelles et l’exercice des droits. Elle constitue une information, et non un consentement au traitement ni une renonciation aux droits. Les statistiques et rapports d’erreurs optionnels nécessitent des consentements distincts. Les refuser ou retirer votre accord ne désactive pas les fonctions principales.",
            "L’entreprise qui ajoute des données de clients ou de salariés demeure responsable de ses obligations de protection des données. Lorsque l’exploitant traite ces données pour son compte, un accord de sous-traitance approprié est nécessaire. Ces conditions et la Politique de confidentialité ne remplacent pas cet accord.",
          ],
        },
        {
          id: "fees",
          title: "7. Tarifs et futurs services payants",
          paragraphs: [
            "Ces conditions ne fixent aucun prix d’abonnement et n’autorisent aucun paiement. L’achat automatique d’un abonnement et l’encaissement ne sont pas actuellement implémentés dans l’application.",
            "Toute future offre payante devra préciser séparément son prix, les taxes, la périodicité, le renouvellement, la résiliation et les remboursements avant votre accord. L’utilisation actuelle du service n’autorise pas, à elle seule, de futurs prélèvements.",
          ],
        },
        {
          id: "availability",
          title: "8. Disponibilité et évolution",
          paragraphs: [
            "Le service dépend d’une connexion internet et d’infrastructures tierces. La maintenance, les mises à jour et les incidents peuvent interrompre l’accès. Ces conditions ne prévoient pas de garantie de disponibilité ni de délai de rétablissement.",
            "Les fonctionnalités peuvent évoluer. Les changements importants affectant un service convenu seront communiqués de manière appropriée. Ne considérez pas une fonctionnalité future annoncée comme déjà disponible.",
          ],
        },
        {
          id: "ownership",
          title: "9. Propriété intellectuelle de l’application",
          paragraphs: [
            "L’exploitant ou ses concédants conservent les droits sur l’application, la marque et les contenus originaux du site. Sous réserve de ces conditions, vous pouvez utiliser le service pour vos activités professionnelles autorisées. Les composants tiers et open source restent soumis à leurs propres licences.",
            "Vous ne pouvez pas présenter RenvoDesk comme votre propre produit ni utiliser sa marque pour suggérer une affiliation non autorisée. Cela ne limite pas les droits accordés par la loi ou par une licence open source applicable.",
          ],
        },
        {
          id: "ending",
          title: "10. Suspension et fin d’utilisation",
          paragraphs: [
            "Vous pouvez cesser d’utiliser le service et demander la fermeture de votre compte à l’exploitant. La fermeture en libre-service, l’export complet d’un espace et la suppression automatique des projets ne sont pas actuellement disponibles. Les demandes doivent tenir compte des droits de l’entreprise sur les données partagées et des obligations de conservation.",
            "L’accès peut être restreint lorsque cela est raisonnablement nécessaire en cas d’utilisation illégale, de manquement important, de menace de sécurité ou d’obligation légale. Lorsque cela est possible et licite, l’exploitant expliquera le motif et permettra de remédier au problème. Une situation urgente peut nécessiter une action immédiate.",
          ],
        },
        {
          id: "liability",
          title: "11. Responsabilités et différends",
          paragraphs: [
            "Chaque partie conserve ses responsabilités prévues par le droit applicable. RenvoDesk ne garantit ni la rentabilité d’un projet, ni le résultat des travaux, ni leur conformité légale. Les décisions concernant les travaux et les contrats clients relèvent de l’entreprise et de ses conseillers qualifiés.",
            "Aucune disposition n’exclut une responsabilité ou un droit qui ne peut légalement être exclu, y compris les protections impératives des consommateurs qui resteraient applicables malgré la vocation professionnelle du service. En particulier, ces conditions n’excluent pas la responsabilité pour faute intentionnelle, faute lourde ou inexécution des obligations contractuelles essentielles lorsqu’une telle exclusion est illicite. Aucun plafond contractuel chiffré de responsabilité n’est établi ici.",
            "Vous êtes invité à contacter l’exploitant pour permettre l’examen d’un différend. Cette démarche ne conditionne pas un recours en justice, une mesure urgente ou la saisine d’une autorité de contrôle. La loi applicable et les juridictions compétentes sont déterminées par les règles pertinentes et tout accord particulier valable ; ces conditions n’imposent pas de juridiction exclusive et ne suppriment aucun droit impératif.",
          ],
        },
        {
          id: "updates",
          title: "12. Modifications et contact",
          paragraphs: [
            "La date ci-dessus identifie cette version. Les modifications importantes seront communiquées par un moyen approprié et ne supprimeront pas rétroactivement des droits acquis. Lorsqu’un nouvel accord est requis, il devra être recueilli séparément.",
            "Utilisez les coordonnées de l’exploitant ci-dessous pour les questions relatives aux conditions, au service ou à la fermeture d’un compte.",
          ],
        },
      ],
    },
    privacy: {
      title: "Politique de confidentialité",
      intro:
        "Cette politique explique les données personnelles traitées lors de votre visite sur RenvoDesk ou de l’utilisation d’un espace de travail, leurs finalités, leurs destinataires et vos choix.",
      sections: [
        {
          id: "roles",
          title: "1. Qui est responsable de vos données",
          paragraphs: [
            "L’exploitant identifié ci-dessous est responsable des données utilisées pour gérer son site, ses relations commerciales, les comptes, la sécurité et les mesures optionnelles. L’exploitant et le contact confidentialité sont identifiés dans la rubrique Exploitant et contact ci-dessous.",
            "Pour les données de clients, travailleurs ou autres personnes ajoutées à un espace, l’entreprise détermine généralement les finalités et agit comme responsable du traitement. L’exploitant traite ces données pour son compte afin de fournir le service. Cette relation nécessite un accord de sous-traitance distinct.",
            "Si une entreprise de rénovation a ajouté vos informations, elle est normalement responsable des demandes concernant le dossier. Vous pouvez aussi contacter l’exploitant pour identifier l’entreprise responsable ou lui transmettre votre demande. Cela ne limite ni vos droits ni les obligations propres de l’exploitant.",
          ],
        },
        {
          id: "data",
          title: "2. Données collectées et sources",
          paragraphs: [
            "Les données de compte et d’entreprise comprennent l’adresse e-mail, les informations d’authentification et de session, le nom et le pays de l’entreprise, le rôle, les invitations et les coordonnées professionnelles facultatives. Elles proviennent de vous, de la personne qui vous invite ou de l’administrateur de votre entreprise.",
            "Les espaces peuvent contenir des coordonnées clients et de facturation, adresses de biens, descriptions de projets, devis, tâches, attributions, dépenses, notes, photos, enregistrements vocaux, fichiers, croquis et journaux identifiant l’auteur d’une action. Ces données proviennent des utilisateurs autorisés. Les fichiers peuvent inclure des données ou métadonnées fournies par leurs auteurs.",
            "Les services techniques reçoivent des informations réseau, comme l’adresse IP, des informations de navigateur et de requête et des horodatages, lors d’une connexion. Les données optionnelles de mesure sont décrites ci-dessous. La collecte de cartes bancaires et la facturation automatique ne sont pas implémentées.",
          ],
        },
        {
          id: "purposes",
          title: "3. Finalités et bases légales",
          paragraphs: [
            "La gestion du compte et la fourniture du service utilisent les données nécessaires à l’exécution d’un contrat avec vous, ou aux mesures précontractuelles demandées, lorsque vous êtes personnellement partie au contrat. Pour les représentants et membres d’une entreprise, la base pertinente est l’intérêt légitime à gérer la relation professionnelle et les accès autorisés, sous réserve de leurs droits.",
            "La sécurité, la prévention des abus, l’intégrité du service et le traitement des demandes reposent sur l’intérêt légitime à exploiter un service fiable, ou sur une obligation légale lorsqu’elle s’applique. Des informations peuvent être conservées pour constater, exercer ou défendre des droits en justice.",
            "La collecte optionnelle par Google Analytics et Sentry repose sur vos consentements distincts. Le traitement des données d’un espace suit les instructions, finalités, bases légales et accords de l’entreprise ; l’exploitant ne choisit pas de finalité marketing indépendante pour ces contenus.",
            "L’e-mail du compte et les informations nécessaires à une opération demandée sont requis pour fournir cette fonction. Les coordonnées facultatives et le consentement aux mesures ne sont pas nécessaires aux fonctions principales. Refuser le suivi ne réduit pas vos autorisations dans l’espace.",
          ],
        },
        {
          id: "storage",
          title: "4. Stockage du navigateur et consentement",
          paragraphs: [
            "Inventaire du stockage (version 2026-09-23) : RenvoDesk utilise le stockage du navigateur décrit ici pour les finalités indiquées. Le stockage local et la conservation chez les prestataires sont distincts ; effacer l’un n’efface pas l’autre.",
            "Préférences nécessaires : renvodesk-privacy-v1 (stockage local) enregistre pour RenvoDesk vos choix de statistiques et diagnostics ainsi que leur date. Ces choix sont valables 180 jours ; l’entrée peut rester dans le navigateur jusqu’à son remplacement ou son effacement. renvodesk-locale (stockage local) mémorise le français ou l’anglais jusqu’à modification ou effacement, sans expiration automatique.",
            "Authentification : sb-<project-ref>-auth-token (stockage local) contient la session Supabase nécessaire aux fonctions connectées. RenvoDesk et Supabase l’utilisent pour maintenir l’accès authentifié ; elle persiste jusqu’à la déconnexion, au nettoyage de session ou à l’effacement du navigateur. Le service d’authentification contrôle l’expiration et le renouvellement des jetons. Les entrées associées *-code-verifier, y compris celles de chaque flux et leur index, sécurisent les retours d’inscription et de récupération. La bibliothèque nettoie les flux terminés ; les entrées abandonnées peuvent rester jusqu’à son nettoyage ou à l’effacement du navigateur, sans délai d’expiration du navigateur.",
            "Cookies statistiques optionnels : _ga et _ga_<measurement-id> identifient un navigateur et maintiennent les informations de session Google Analytics. Ils nécessitent votre consentement aux statistiques, avec une durée maximale configurée de 180 jours et sans renouvellement automatique des cookies. RenvoDesk les supprime lors du retrait de ce consentement. Google reçoit les données statistiques associées.",
            "Diagnostics optionnels : l’intégration Sentry configurée transmet les erreurs après consentement aux diagnostics et ne place pas intentionnellement de cookie de diagnostic ni d’identifiant persistant dans le navigateur. La relecture de session et le traçage des performances sont désactivés. Sentry reçoit les erreurs décrites ci-dessous. Cet inventaire couvre l’intégration applicative ; toute modification des prestataires ou intégrations nécessite une nouvelle vérification.",
            "Le navigateur conserve la session de connexion, la langue de l’interface et vos préférences de confidentialité. Cela permet l’authentification, le choix de langue et la mémorisation de vos décisions. La déconnexion ou l’effacement du stockage affecte les informations correspondantes.",
            "Les statistiques et diagnostics sont désactivés jusqu’à votre accord. Le contrôle Paramètres des cookies, présent sur les pages de production où ces outils sont activés, permet d’accepter, de refuser ou de choisir séparément chaque catégorie, puis de modifier ce choix. Votre préférence expire après 180 jours. Si le stockage du navigateur est indisponible, elle s’applique uniquement à la page en cours.",
            "Le retrait du consentement arrête la collecte optionnelle future et supprime les cookies Google Analytics de l’application. Il ne remet pas en cause les traitements antérieurs licites. Les requêtes déjà envoyées ne peuvent pas être rappelées ; les droits à l’effacement restent applicables selon les circonstances.",
          ],
        },
        {
          id: "analytics",
          title: "5. Statistiques et diagnostics optionnels",
          paragraphs: [
            "Google Analytics 4 mesure des catégories de pages génériques, la langue et certaines actions, comme créer un projet ou enregistrer un devis. Il utilise un identifiant de navigateur dans des cookies consentis, configurés pour une durée maximale de 180 jours. Les événements applicatifs excluent les noms de clients et de projets, montants, documents et identifiants de dossiers. Les URL complètes, paramètres et jetons d’authentification ne sont pas volontairement transmis.",
            "Si vous activez les diagnostics, Sentry reçoit des rapports limités aux types d’erreurs génériques, emplacements de fichiers statiques de l’application, lignes et colonnes, catégories de pages et éventuel identifiant de version logicielle. Les messages bruts, informations utilisateur, corps de requêtes, formulaires et historiques de navigation sont retirés. Le projet Sentry configuré se situe en Allemagne.",
            "L’enregistrement des sessions, le suivi publicitaire et le traçage des performances ne sont pas activés par cette intégration. Les deux prestataires reçoivent néanmoins des informations réseau à réception d’une requête. Ces rapports concernent les navigateurs consentants et ne constituent pas un relevé exhaustif de l’activité.",
          ],
        },
        {
          id: "recipients",
          title: "6. Destinataires des données",
          paragraphs: [
            "Les personnes autorisées de votre entreprise accèdent aux données selon leur rôle. Les propriétaires disposent des accès administratifs et financiers ; les membres consultent les informations opérationnelles et modifient les tâches attribuées. Les informations téléchargées et partagées hors de RenvoDesk sont ensuite traitées par les destinataires que vous choisissez.",
            "Les prestataires techniques comprennent Supabase pour l’authentification, la base de données et le stockage privé, l’hébergeur VPS pour le site, ainsi que Google Analytics et Sentry avec votre consentement. Le VPS du site est situé à Paris, en France. Le projet Supabase configuré se situe à Francfort. Le personnel et les sous-traitants des prestataires peuvent accéder aux données lorsque leurs missions contractuelles et l’assistance le nécessitent.",
            "Des données peuvent aussi être communiquées lorsque la loi l’exige, pour protéger des droits ou à des conseils professionnels soumis à une confidentialité appropriée. L’hébergeur VPS effectif, les accords de traitement et les durées restantes de conservation de l’infrastructure doivent être vérifiés par l’exploitant avant la publication définitive de cette notice.",
          ],
        },
        {
          id: "transfers",
          title: "7. Localisation et transferts internationaux",
          paragraphs: [
            "Une région européenne pour la base de données ou les rapports d’erreurs ne signifie pas que toutes les opérations connexes restent dans l’EEE. L’assistance, les sous-traitants et les services Google peuvent impliquer des traitements dans d’autres pays.",
            "Les transferts hors EEE doivent reposer, lorsque cela est requis, sur un mécanisme légal tel qu’une décision d’adéquation applicable ou des clauses contractuelles types accompagnées des garanties complémentaires nécessaires. L’exploitant doit confirmer les mécanismes correspondant à ses accords effectifs. Vous pouvez demander des informations sur les garanties et l’obtention d’une copie au contact confidentialité ci-dessous.",
          ],
        },
        {
          id: "retention",
          title: "8. Conservation et suppression",
          paragraphs: [
            "Les informations de compte et d’espace sont conservées tant qu’elles sont nécessaires au service demandé et aux dossiers professionnels autorisés. Les décisions de conservation tiennent compte de la relation active, des instructions de l’entreprise, de la finalité du dossier, des obligations légales et des différends ou enquêtes de sécurité en cours.",
            "Retirer un membre, révoquer une invitation ou annuler une dépense n’efface pas automatiquement l’historique associé. Certains éléments supprimés ou annulés laissent une trace historique. Il n’existe actuellement aucun processus automatique de suppression du compte ou d’effacement intégral d’un projet ; les demandes doivent être examinées par l’exploitant et, si nécessaire, par l’entreprise. L’absence d’outil en libre-service ne supprime pas un droit applicable à l’effacement et ne prolonge pas le délai légal de réponse.",
            "Les préférences de confidentialité et cookies de mesure suivent les durées de 180 jours décrites ci-dessus. La conservation des données utilisateur et événementielles de Google Analytics est configurée sur deux mois, sans réinitialisation lors d’une nouvelle activité. Google supprime les données expirées lors de son traitement mensuel ; ce réglage ne concerne pas les rapports agrégés standards. Les événements d’erreur Sentry du forfait Developer ont une durée de conservation standard de 30 jours. L’expiration d’un cookie n’efface pas les données déjà reçues par ces prestataires. La conservation des journaux d’infrastructure et la suppression des sauvegardes restent à confirmer avant finalisation de la notice. Une obligation légale de conservation peut justifier le maintien de données, avec limitation des usages sans rapport.",
          ],
        },
        {
          id: "security",
          title: "9. Sécurité et vos responsabilités",
          paragraphs: [
            "L’application utilise des accès authentifiés, des autorisations de base de données par entreprise et un stockage privé des fichiers. Les rôles limitent les actions disponibles. Ces mesures réduisent les risques sans rendre un service en ligne totalement sûr.",
            "Protégez les identifiants, contrôlez les accès et obtenez les autorisations nécessaires avant d’ajouter des données, photos ou enregistrements. Évitez les données sensibles inutiles. Le service s’adresse à des professionnels adultes, et non aux enfants.",
          ],
        },
        {
          id: "rights",
          title: "10. Vos droits",
          paragraphs: [
            "Selon les circonstances et le droit applicable, vous pouvez demander l’accès, la rectification, l’effacement, la limitation et la portabilité de vos données. Vous pouvez vous opposer à un traitement fondé sur l’intérêt légitime et retirer un consentement optionnel, sans remettre en cause les traitements antérieurs licites.",
            "Contactez l’exploitant aux coordonnées ci-dessous ou l’entreprise responsable de votre dossier. Votre identité ou votre habilitation peut être vérifiée de manière proportionnée. Les demandes RGPD reçoivent normalement une réponse sous un mois ; une prolongation de deux mois supplémentaires au maximum est possible si la complexité ou le nombre des demandes le justifie, avec information motivée pendant le premier mois. Les demandes sont normalement gratuites. Tout refus ou frais légalement justifié doit être expliqué, avec indication des voies de réclamation et de recours.",
            "Vous pouvez déposer une réclamation auprès d’une autorité de protection des données compétente, notamment dans le pays de l’EEE où vous résidez, travaillez ou où une violation présumée a eu lieu. Il n’est pas nécessaire de contacter d’abord l’exploitant pour exercer ce droit.",
          ],
        },
        {
          id: "automation",
          title: "11. Décisions automatisées",
          paragraphs: [
            "RenvoDesk n’utilise pas les fonctions de projet ou statistiques décrites pour prendre des décisions exclusivement automatisées produisant des effets juridiques ou similaires significatifs sur les personnes. Les totaux calculés et synthèses assistent les utilisateurs sans remplacer les décisions de l’entreprise.",
          ],
        },
        {
          id: "changes",
          title: "12. Modifications et informations complémentaires",
          paragraphs: [
            "La date ci-dessus identifie cette politique, qui sera révisée lorsque les pratiques pertinentes changent. Les modifications importantes vous seront signalées lorsque cela est requis. Une nouvelle finalité optionnelle nécessitant un consentement ne peut pas être activée par la seule modification de cette politique.",
            "Pour les questions de confidentialité, utilisez les coordonnées ci-dessous. Les notices des prestataires et l’annuaire des autorités de contrôle sont accessibles à la fin de cette page.",
          ],
        },
      ],
    },
  },
};

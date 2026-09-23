# RenvoDesk legal readiness review — 23 September 2026

## Conclusion and scope

The documents are useful working drafts, not a completed legal launch package.
Reviewed both languages, legal-page rendering, account UI and telemetry code
against the official sources below. This is a technical/documentary risk review,
not a Belgian lawyer's opinion or certification. No provider dashboard, signed
contract, business-register entry, live deployment or operational procedure was
verified. Removing the missing-address notice did not resolve the gaps below.

## Findings requiring action

| Priority | Evidence and risk | Required next step |
| --- | --- | --- |
| High | Operator block has name/address/email, but no enterprise number or phone. Registration field is optional in the renderer. | Confirm registered entity/legal form, BCE/KBO number, VAT status and public phone; publish the applicable identification. Belgian online-service guidance requires these details [1]. |
| High | Terms §6 and privacy §1 refer to a separate processing agreement, but these pages are not one. | Execute a customer DPA before processing their personal data; confirm supplier DPAs, authorised subprocessors and actual assistance/deletion arrangements. The agreement needs documented instructions, confidentiality, security, assistance, return/deletion, audits and subprocessor controls [2]. |
| High | Privacy §§6–8 explicitly leave hosting, transfer safeguards and retention settings unconfirmed. | Inventory actual provider legal entities and processing locations. Confirm applicable transfer mechanisms, then publish accurate specifics. An EU region alone is insufficient. Set and implement retention/deletion rules for accounts, invitations, histories, files, GA4, Sentry, logs and backups; criteria must be meaningful, not merely “as needed” [3]. |
| High | No terms version/acceptance evidence in account creation; no legal-document links in the account form. Footer alone is weak evidence that terms were provided before agreement. | Provide privacy information at collection and choose a versioned contractual acceptance flow with durable evidence. Obtain agreement to commercial terms separately from optional tracking. A privacy notice is information, not blanket consent. Do not claim existing users accepted these terms [4,5]. |
| High | Consent is a version-1 browser-local record with timestamp and two booleans. Banner names providers but not the operator; policy has no complete storage inventory. Provider dashboard settings were not inspected. | Document cookie/storage names, purposes, recipients and duration, including necessary storage; add operator identification in the consent information. Archive banner/policy versions and establish proportionate consent evidence. Verify live reject/withdrawal and enhanced-measurement settings. The 180-day preference expiry is useful, not proof of complete compliance [4]. |
| High | No whole-project/account deletion or full workspace export workflow; historical rows and storage objects have distinct lifecycle rules. | Establish and test a manual rights/closure procedure now, including tenant authority, identity checks, linked records, object bytes, backups and lawful exceptions. Automated UI is not legally required, but actual timely fulfilment is. Keep a request log; do not promise erasure you cannot perform [6]. |
| Medium | Terms have no agreed liability cap, SLA or chosen governing law/forum; suspension and feature-change provisions are general. | Have Belgian counsel draft proportionate B2B risk allocation based on fees, insurance and service commitments. Clarify notice, termination, access to data and consequences of discontinuation. Do not insert a zero-liability clause, arbitrary cap or unilateral acceptance presumption; Belgian B2B unfair-terms rules apply [5]. |
| Medium | Notices alone do not establish operational GDPR compliance. | Document purposes/bases and legitimate-interest assessments, processing records, security/backup recovery and incident response. Assess whether a DPO/DPIA is required rather than claiming one is always required. Processor breach notice is without undue delay; controller authority notification is generally within 72 hours where required, not a universal deadline for every incident [7]. |
| Before paid launch | No subscription checkout or consumer exclusion enforcement. | Decide B2B eligibility and prepare price/tax/renewal/cancellation/refund information before paid contracting. A professional-use label alone does not eliminate any mandatory consumer protection. Ask counsel to assess Belgian law and the intended French/Dutch customer markets. |

## Corrections made in this review

- Removed outdated statements that all operator/contact details are absent.
- Clarified that privacy information is not blanket processing consent.
- Removed language implying a prior complaint to the operator is mandatory.
- Clarified that workspace users can ask the operator for help with requests.
- Explained that missing self-service deletion does not suspend legal rights.
- Clarified request deadlines, extensions, normal free handling and remedies.
- Made mandatory liability safeguards more explicit, without inventing a cap.
- Added a direct Belgian authority complaint link and updated the revision date.

Existing strengths: separate analytics/diagnostic choices, default-off optional
tracking, no implemented advertising/replay, constrained telemetry payloads,
content ownership retained by customers, accurate estimate/PDF limitations,
no invented prices or automatic charges, and preservation of mandatory rights.
These are source-code findings, not a live traffic or security audit.

## Sources

1. [SPF Economie — business website identification](https://economie.fgov.be/fr/themes/line/commerce-electronique/vente-par-internet/site-dentreprise-et-comptes)
2. [EDPB — controller/processor contracts and duties](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en)
3. [EDPB — retention transparency assessment, Article 13(2)(a)](https://www.edpb.europa.eu/system/files/2021-09/dpc_final_decision_redacted_for_issue_to_edpb_01-09-21_en.pdf); [international transfers](https://www.edpb.europa.eu/topics/international-transfers-and-international-cooperation_en)
4. [Belgian APD — cookie checklist](https://www.autoriteprotectiondonnees.be/publications/checklist-cookies.pdf)
5. [SPF Economie — unfair B2B terms](https://economie.fgov.be/fr/themes/entreprises/protection-des-entreprises/clauses-abusives)
6. [EDPB — individual rights](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en); [information duties FAQ](https://www.edpb.europa.eu/sme/find-practical-info/faq_en)
7. [EDPB — breach handling](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en)

## Verification

Lint and production build (including TypeScript) passed. All four FR/EN legal
page desktop/mobile browser checks passed. No deployment or legal certification.

# Legal pages

French: `/terms/`, `/privacy/`. English: `/en/terms/`, `/en/privacy/`.
The landing footer links to both documents. They include a table of contents,
language switching, operator details and the existing privacy controls. Builds
include complete static HTML; legal drafts remain noindex and outside the sitemap.

## Before publication

The user supplied Chobanyan Solutions, Rue du Bauloy 81 · 1340 Ottignies-Louvain-la-Neuve,
and contact@renvodesk.com on 23 September 2026. These are shared FR/EN defaults;
build-time values override them. The user confirmed postal code 1340 and Belgium
on 23 September 2026. The country default is localized as Belgium / Belgique.
Applicable registration/VAT identification remains pending.

Set the following public build-time values in the production environment, then
rebuild. They are displayed publicly; never put secrets in these fields.

- `VITE_PRIVACY_OPERATOR`: registered legal operator name.
- `VITE_PRIVACY_EMAIL`: monitored privacy/support contact.
- `VITE_LEGAL_ADDRESS`: business address.
- `VITE_LEGAL_COUNTRY`: operator country.
- `VITE_LEGAL_REGISTRATION`: applicable registration/VAT identification.

Missing name, email, address or country displays a draft notice. Supplying those
fields removes that notice; it does not establish legal review or compliance.
Verify the actual VPS provider, processors, contracts, transfer safeguards,
retention settings and deletion/backup procedures against the privacy text.
Agree a data processing agreement for customer workspace data where required.
Review the terms against the operator's jurisdiction and any commercial offer.
The text does not invent a price, paid subscription, uptime commitment, deletion
deadline or governing jurisdiction. Displaying the terms does not record consent
to a contract; signup now requires a checkbox in the UI, but durable acceptance records have not been added.

Copy is maintained in `src/features/landing/legal-copy.ts`; keep both languages
aligned and update the displayed revision date when the policy changes.

## Existing Nginx deployment

The repository template includes the new routes. On an already configured HTTPS
server, preserve the Certbot TLS directives and add these locations inside the
`renvodesk.com` server block if missing:

```nginx
location = /terms { return 308 /terms/; }
location = /en/terms { return 308 /en/terms/; }
location = /terms/ { try_files /terms/index.html =404; }
location = /en/terms/ { try_files /en/terms/index.html =404; }
```

Run `sudo nginx -t` before reloading Nginx. Upload the entire new `dist/` tree,
including the `terms/`, `privacy/`, `en/` and `assets/` directories. The local
implementation does not update the VPS. Caddy's alternative routing template is
also updated.

## Reference material

- [European Commission: GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en)
- [European Commission: obligations](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en)
- [EDPB: controller and processor roles](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en)
- [EDPB: individual rights](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en)
- [EDPB: international transfers](https://www.edpb.europa.eu/topics/international-transfers-and-international-cooperation_en)

## Legal review

See the [23 September 2026 review](reviews/2026-09-23-legal-review.md) for open
launch requirements, including enterprise identification, phone, processing
agreements, retention/transfers and contract acceptance. The absence of the
missing-operator banner does not mean these requirements have been completed.

## Hosting location confirmed

On 23 September 2026, the user confirmed that VPS 1280116 is located in Paris,
France. Both privacy-policy versions now state that location. The IP-network
lookup suggests Hostinger; the contracting legal entity and processing agreement
remain unconfirmed. This location does not establish that all provider processing
or support takes place in France or the EEA.

Signup now has an initially unchecked required Terms checkbox and FR/EN legal
links opening in new tabs. Native validation and a submit-handler check prevent
unaccepted signup through this UI. This does not enforce acceptance at the Auth
API or store durable acceptance evidence; server-side versioned records remain
unimplemented. Existing users are not gated.

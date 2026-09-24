# 024 — Workspace preferences and subscription settings boundary

Date: 2026-09-24. Development implementation applied.

The existing owner-only company settings route is labeled **Settings**.
It holds the company's country, a default interface language, document contact
details and account/workspace storage usage. Subscription management has a clearly
marked future section; no plans, prices, billing changes or payment actions exist.

The workspace language is French or English. It applies when a person has not
chosen a personal interface language. A person's manual language choice persists
across reloads and workspaces. Previously saved browser language choices remain
personal choices. This is an interface default, not a translation or amendment of
saved estimates, sent snapshots or project content.

Location means the company's BE/FR/NL country. Owners may correct it; changing it
does not alter project/property addresses, sent estimate snapshots, tax treatment
or financial records. A draft PDF generated later uses the current company country.
Contact details retain a separate revision so independent edits
do not conflict. Workspace preferences have their own revision and owner-only
column grants plus the existing owner RLS policy.

EUR remains the only financial currency. The settings page shows it as fixed. A
future multi-currency change needs explicit amount currency fields, conversion and
snapshot rules throughout estimates and costs; a display preference cannot safely
convert the existing EUR records.

See [implementation plan](../plans/2026-09-24-workspace-settings.md). The migration
is applied only to the RenvoDesk development Supabase project; production rollout
has not occurred.

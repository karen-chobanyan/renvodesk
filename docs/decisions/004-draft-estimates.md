# 004 — Project-linked draft estimates

Draft estimates are company-owned and linked to a saved project by a composite
foreign key. Multiple drafts may belong to a project. Their title is not an issued
document number. They do not change the project budget or imply customer acceptance.

Line items are one JSON snapshot on the draft row (up to 100), enabling atomic
saving with the same optimistic revision approach as projects. A separate line
entity is deferred until line-specific workflows or reporting require it. A private
SECURITY INVOKER trigger validates every line and computes authoritative totals.
The JSON payload contains id, description, decimal quantity/price strings and unit.
EUR totals exclude tax. Round half-up to cents on each line, then sum; reject totals
outside JavaScript's safe integer range. Empty drafts and zero-price lines are valid.

The shared line editor reuses the existing demo calculation helpers and UI. Stored
descriptions are user content and do not change with the interface language. Demo
and live data providers remain separate. Reads, updates and retry recovery explicitly
filter organization and project. Stable UUID creation retries recover existing drafts.
Conflicts preserve current fields until explicit reload; drafts are not autosaved,
merged or retained across navigation. PDF, sending, acceptance and invoices are later.

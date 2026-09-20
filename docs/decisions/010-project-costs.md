# Cost budgets and actual spending

The saved project overview now shows a manually set cost budget, actual costs and
remaining allowance (or over-budget amount). These replace all fictional financial
figures. A missing budget is explicitly unset; zero is a valid budget. A cost budget
is not contract revenue, a draft estimate total, or forecast profit. Commitments,
estimated remaining work, margins, VAT, payment status and accounting remain outside
this milestone. Costs are manually entered totals; labor time tracking is not included.

`project_budgets` and `project_costs` have composite same-company project foreign keys,
member reads, owner writes and explicit column grants. Budgets and costs have their
own revision checks. Create retries retain the cost UUID. A concurrent or uncertain
first budget insert requires explicit reload; no blind upsert overwrites an existing
budget. Corrections update a loaded revision. Voiding also matches the revision;
voided entries cannot be changed or restored and remain visible. No hard deletion.
This is operational history, not an immutable accounting audit of every edit.

All amounts are integer cents, EUR excluding tax. Individual amounts and budgets are
capped at 999,999,999 cents. Costs are positive; credits/refunds are not implemented.
Client parsing uses decimal strings and BigInt; no floating multiplication. The
SECURITY INVOKER summary RPC aggregates every non-voided row in one database snapshot,
returns aggregate numeric sums as text, and returns no row for an inaccessible
project. BigInt formatting preserves aggregate precision beyond JS safe integers.
No totals are derived from the currently loaded 20-row list.

Costs require description, category (materials/labor/subcontractors/other) and a
calendar date between 1900–2100; notes are optional. No automatic links to estimates,
receipts, supplier invoices or file uploads. File storage stays available separately.

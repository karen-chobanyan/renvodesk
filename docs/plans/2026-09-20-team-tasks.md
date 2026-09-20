# Team invitations and task assignment

- [x] Inspect current owner-only memberships and task revision boundaries.
- [x] Confirm the first teammate permission model with the user before changing authorization.
- [x] Implement owner-created, expiring, revocable invitations bound to a verified recipient email; transactional acceptance and retry recovery.
- [x] Add a company team page, acceptance flow and same-company assignee controls in FR/EN.
- [x] Enforce the agreed teammate task permissions and owner-only administration; preserve revision conflicts.
- [x] Verify invitation expiry/revocation/replay, recipient matching, cross-company denial, assignment constraints and browser flows.
- [x] Update decisions, README, agent guidance and setup docs.

Invitation transport: provide a copyable application link for the owner to share.
Do not send email from this task or imply that SMTP delivery is configured.
Acceptance requires an explicit click by the verified intended recipient. No service
key in the browser. Existing owner memberships and onboarding behavior are preserved.

Permission decision: members view projects/files/tasks and edit assigned tasks. Owners
manage finance, clients and team administration. The user explicitly approved the migration,
which was applied as `20260920121357_team_tasks`. Hosted rollback isolation tests passed;
types regenerated and UI integrated. See decision 012.

Verification: lint/typecheck/build, 30 unit tests and 33 browser tests passed (one
intentional desktop skip). Desktop/mobile team screenshots inspected. Hosted checks
cover invitation lifecycle, assignment/role boundaries, finance/directory denial and
file read/write permissions. Existing password-protection advisor warning unchanged.

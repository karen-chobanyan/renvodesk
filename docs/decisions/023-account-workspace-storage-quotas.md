# 023 — Account and workspace storage quotas

Date: 2026-09-24. Product rule confirmed. Development implementation applied;
production verification and rollout remain open.

Each account receives 1 GB total across the workspaces it owns. Each workspace
also has a 1 GB ceiling. These limits are nested, not additive: creating another
workspace does not increase an account's allowance. Joining another account's
workspace does not consume the invited member's allowance.

The implementation plan defines GB as 1,000,000,000 bytes and proposes attributing
each workspace to its immutable organization creator in the current ownership
model. Existing ownership must be verified before backfill. Ownership transfer is
outside this milestone and would require explicit quota reassignment rules.

The plan covers documents, photos, audio, CAD attachments and all retained sketch
scene/preview revisions. Pending uploads reserve capacity before object storage
writes. A full allowance blocks additional storage allocation while preserving
existing access and safe recovery. No automatic deletion of existing content is
authorized by this decision.

See [implementation plan](../plans/2026-09-24-storage-quotas.md) for enforcement,
backfill, recovery, UI, tests and rollout. The quota migration is applied to the
RenvoDesk development Supabase project. Rollback SQL verifies its database
behavior. A two-connection account-limit test passed. Live Storage API metadata
behavior remains unverified; the application has not been deployed to production.

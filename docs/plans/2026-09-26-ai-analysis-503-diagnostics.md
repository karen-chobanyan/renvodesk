# Diagnose the first live AI analysis 503

- [x] Confirm the browser-to-API proxy, local configuration and read-only provider model access without exposing credentials.
- [x] Return a bounded, non-sensitive failure stage for expected upstream and AI validation errors; keep private error details out of browser responses.
- [x] Verify the diagnostic path with API tests, lint and typecheck, then use the stage to fix the actual failing operation.
- [x] Confirm the revised behavior with an owner-initiated live retry, if the owner accepts the additional provider charge.

The first live owner request returned `{ "error": "service_unavailable" }`. Both local servers and the configured provider models are reachable. A generic 503 currently hides whether Supabase, transcription, proposal generation or proposal validation failed. No customer audio should be sent again merely to inspect logs without the owner's action or approval.

The owner approved one paid synthetic text probe. It exercised the proposal
request successfully without sending project audio. An owner-initiated retry of
the saved recording returned `proposal_invalid`, proving that the recording
reached the proposal validation stage. The validator now omits individual
unverified suggestions and preserves a valid transcript when the entire
proposal is malformed. The review makes either condition visible. The owner
approved one further retry and confirmed that the live review displayed the
French transcript, summary and task suggestions. This confirms the owner path
for that recording; it does not verify other recordings or production rollout.

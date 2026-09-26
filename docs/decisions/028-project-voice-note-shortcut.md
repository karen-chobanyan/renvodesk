# 028 — Project voice-note shortcut

Date: 2026-09-26. Status: implemented locally.

The live project overview exposes an owner-only **Record voice note** action. It
opens the existing project Documents recorder and switches to Documents so the
captured file can be reviewed and uploaded through the existing private project
file flow. The Documents action remains available. This keeps recording tied to
a project without adding a global navigation item or another upload path.

At this stage, the action recorded audio only. Decision 029 subsequently added
owner-requested transcription, summaries and review-only task suggestions behind
a disabled-by-default feature flag. Members retain read-only access to project files.

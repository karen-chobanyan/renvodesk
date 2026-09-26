# Project voice-note shortcut

- [x] Add an owner-visible, localized recording action near the top of the live project overview.
- [x] Open the existing Documents recorder and retain its review, upload, and retry flow.
- [x] Verify the shortcut in the mocked browser flow and run relevant code checks.

The shortcut creates no new storage path or AI behavior. Members keep their current read-only file access.

Verified with lint, typecheck, and the mocked owner and member browser flows on desktop and mobile Chromium. Live microphone hardware and Storage delivery were not exercised.

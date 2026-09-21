# Project camera and voice capture
- [x] Add camera photo capture and bounded voice recording with review before upload.
- [x] Allow supported audio formats in file validation and private storage; add playback.
- [x] Verify capture cleanup, errors, file validation, upload and existing file flows.

Verified: synthetic camera and real MediaRecorder over synthetic audio on desktop/mobile Chromium, permission denial, stopped device tracks, existing upload recovery/preview/delete, 37 unit tests, lint and TypeScript. Physical devices remain unverified. Remote audio MIME migration applied with existing RLS and 10 MiB limits retained.

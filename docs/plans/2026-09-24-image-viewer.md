# Image viewer workspace

Visual thesis: give site photos and screenshots a generous, quiet viewing plane with
precise controls that match the PDF workspace and the project’s navy/Inter system.
Content: filename and close control, zoom/fit/download toolbar, scrollable image.
Interaction: fit to viewport on open/resize; bounded zoom with keyboard scroll,
clear loading/error feedback and the existing Escape/focus behavior.

- [x] Extend the existing document viewer shell to images without changing PDF/CAD/audio.
- [x] Add responsive image sizing and bounded zoom, preserving signed-URL expiry and download.
- [x] Verify real image pixels, zoom/fit, download, mobile, FR/EN and keyboard; run relevant checks.

Keep private URLs in memory, preserve owner/member permissions, and do not alter uploads.

Validation: lint, TypeScript and production build passed; build reported the existing
large-chunk warnings. The desktop and mobile file workflow passed with a synthetic
1200 × 800 image: rendering, fit, zoom, keyboard panning, viewer download, French
and English controls, dialog viewport bounds, and the adjacent PDF workflow.
Inspected desktop and mobile screenshots. The browser test mocks Storage responses;
it does not establish live network delivery or content scanning.

# Sketch editor modal

- Open sketches from the project list, overview, and activity in local modal state so the route and project forms remain mounted. Preserve existing sketch URLs as direct-link fallbacks.
- Reuse the CAD viewer's large modal proportions, slim header, canvas-first layout, collapsible side history, and mobile bottom dock.
- Keep Excalidraw's own drawing tools; place sketch save, import, export, and status in a compact header. Keep critical save errors visible and move explanatory copy into an information control.
- Confirm pending edits before closing or switching revisions, and keep beforeunload for real page exits.
- Verify desktop and mobile editor flows, including save/retry, history/restore, member read-only access, in-place open/close, and layout overflow.

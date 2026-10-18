# 033 — Architectural brand mark

Date: 2026-10-18

The selected logo direction is a custom angular lowercase “r”, without a dot,
inside a dark green rounded square. Keep the existing Inter wordmark and layout.
Use the same SVG for the landing header/footer, auth screens, application sidebar,
illustrated preview and browser favicon. The decorative image does not repeat the
accessible name supplied by adjacent RenvoDesk text.

`public/favicon.svg` is the artwork source. A small dependency-free BrandMark
component references it, keeping auth and application bundles out of the landing
page. Square dimensions replace the previous narrow text-based mark. The favicon
URL has a version query to invalidate browser caches after this change.

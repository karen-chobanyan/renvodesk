import { startTelemetry } from "./lib/telemetry/runtime";

startTelemetry();
// Keep the public page independent of auth, workspace and drawing dependencies.
if (
  window.location.pathname === "/" ||
  /^\/en\/?$/.test(window.location.pathname) ||
  /^\/(en\/)?privacy\/?$/.test(window.location.pathname)
) {
  void import("./features/landing/landing-entry");
} else {
  // Also protects deployments temporarily using a generic index.html SPA fallback.
  document
    .querySelector('meta[name="robots"]')
    ?.setAttribute("content", "noindex, nofollow");
  document
    .querySelectorAll(
      'link[rel="canonical"], link[hreflang], script[data-landing-schema], meta[property^="og:"], meta[name^="twitter:"]',
    )
    .forEach((node) => {
      node.remove();
    });
  document.title = "RenvoDesk";
  void import("./app-entry");
}

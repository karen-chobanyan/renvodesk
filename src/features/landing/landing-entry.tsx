import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { legalCopy } from "./legal-copy";
import { LegalPage } from "./legal-page";
import "@fontsource-variable/inter";
import "./landing.css";
import { landingCopy } from "./landing-copy";
import { LandingPage } from "./landing-page";

const locale = window.location.pathname.startsWith("/en") ? "en" : "fr";
document.documentElement.lang = locale;
const legalKind = /\/privacy\/?$/.test(window.location.pathname)
  ? "privacy"
  : /\/terms\/?$/.test(window.location.pathname)
    ? "terms"
    : null;
document.title = legalKind
  ? `${legalCopy[locale][legalKind].title} — RenvoDesk`
  : landingCopy[locale].title;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute(
    "content",
    legalKind
      ? legalCopy[locale][legalKind].intro
      : landingCopy[locale].description,
  );
try {
  localStorage.setItem("renvodesk-locale", locale);
} catch {
  /* Storage is optional for a public page. */
}
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
const page = (
  <React.StrictMode>
    {legalKind ? (
      <LegalPage locale={locale} kind={legalKind} />
    ) : (
      <LandingPage locale={locale} />
    )}
  </React.StrictMode>
);
if (root.dataset.prerendered === locale) hydrateRoot(root, page);
else createRoot(root).render(page);

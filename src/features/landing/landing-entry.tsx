import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { PrivacyPage } from "./privacy-page";
import "@fontsource-variable/inter";
import "./landing.css";
import { landingCopy } from "./landing-copy";
import { LandingPage } from "./landing-page";

const locale = window.location.pathname.startsWith("/en") ? "en" : "fr";
document.documentElement.lang = locale;
const privacy = window.location.pathname.includes("privacy");
document.title = privacy
  ? locale === "fr"
    ? "Confidentialité — RenvoDesk"
    : "Privacy — RenvoDesk"
  : landingCopy[locale].title;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", landingCopy[locale].description);
try {
  localStorage.setItem("renvodesk-locale", locale);
} catch {
  /* Storage is optional for a public page. */
}
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
const page = (
  <React.StrictMode>
    {privacy ? (
      <PrivacyPage locale={locale} />
    ) : (
      <LandingPage locale={locale} />
    )}
  </React.StrictMode>
);
if (root.dataset.prerendered === locale) hydrateRoot(root, page);
else createRoot(root).render(page);

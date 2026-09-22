import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./landing.css";
import { landingCopy } from "./landing-copy";
import { LandingPage } from "./landing-page";

const locale = window.location.pathname.startsWith("/en") ? "en" : "fr";
document.documentElement.lang = locale;
document.title = landingCopy[locale].title;
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
    <LandingPage locale={locale} />
  </React.StrictMode>
);
if (root.dataset.prerendered === locale) hydrateRoot(root, page);
else createRoot(root).render(page);

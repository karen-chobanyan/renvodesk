# Landing page: construction and product clarity

Visual thesis: a contractor's working desk, led by real application screens and clear renovation language.
Content plan: explicit software/audience hero and project screenshot; three screenshot-led use cases for estimates, tasks and costs; site capture and FAQ; signup.
Interaction thesis: restrained screenshot perspective and hover depth, CAD-style axonometric illustration with exploded roof layer below the product explanation, reduced-motion support retained.

- [x] Capture actual application UI with fictional fixtures in FR/EN; no customer data.
- [x] Rewrite the first viewport and feature/use-case headings so the purpose is immediate.
- [x] Replace illustrative dashboard with screenshot-led feature sections; preserve SEO and localization.
- [x] Verify responsive layouts, images, links, build and browser tests.

Captured four actual application screens in each language using fictional Playwright
fixtures: project overview, task panel, cost panel and demo estimate editor.
Screenshots are PNG (roughly 90–130 KB each), lazy-loaded except the hero.
No production/customer records were used. The CAD drawing is illustrative, not
a representation of implemented measured drawing functionality.

Validation: lint, typecheck, 45 unit tests and build passed. All six landing browser
tests passed across desktop/mobile and FR/EN, including four loaded screenshots,
CAD interaction, reduced motion, navigation and signup. Built-page checks passed
for static content without JavaScript and hydration. Desktop/mobile full-page
renders were visually reviewed. Existing application bundle-size warnings remain;
the landing entry is separate from those bundles.

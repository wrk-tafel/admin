# CoreUI → Tailwind/Material Migration Plan

Status: analysis complete, execution not started. Written 2026-07-17 on branch `tailwind-migration`
(currently identical to `main` — no migration commits exist yet).

## Established target pattern (already proven in ~19 already-migrated files)

Don't invent a new design system — follow what's already there:
- **Angular Material** for structural/interactive widgets: `mat-card` (+`mat-card-header/title/content/footer`),
  `mat-dialog` (via the existing `TafelDialogComponent` wrapper), `mat-button`/`mat-raised-button`/`mat-stroked-button`,
  Material form fields (`MAT_FORM_FIELD_DEFAULT_OPTIONS` is already globally configured in `app.config.ts`).
- **Tailwind utility classes** for layout/spacing on top of that.
- **FontAwesome** (`@fortawesome/angular-fontawesome`) as the primary icon set — already used far more than
  CoreUI icons or `mat-icon`.
- **Custom `tafel-*` components** for shared composite pieces that need one canonical implementation:
  `tafel-dialog`, `tafel-badge` (scss classes), `tafel-banner`, `tafel-pagination`, `tafel-counter-input`, `tafel-toastr`.

Reference examples: `registered-customers.component.html`, `distribution-state.component.html`,
`delete-customer-dialog.component.ts` + `.html`.

## Current footprint

- `package.json` still has 7 CoreUI packages: `@coreui/angular`, `@coreui/angular-chartjs`, `@coreui/chartjs`,
  `@coreui/coreui`, `@coreui/icons`, `@coreui/icons-angular`, `@coreui/utils`.
- ~78 files still `import ... from '@coreui/...'`.
- **47 files** (a broader, only partially overlapping set — includes `login`, `404`/`500`, `ticket-screen`, etc.)
  use Bootstrap-derived utility class *names* in templates (`fw-bold`, `text-end`, `d-flex`, `ms-2`, `row`, `col`,
  `form-control`, ...). These currently work only because CoreUI's bundled Bootstrap CSS is still loaded globally.
  **This is a silent-breakage risk, not a compile-time one** — some class names (`mt-4`, `mb-2`, `row`, `col`)
  exist in both Bootstrap and Tailwind with *different values*, so deleting CoreUI's CSS will change spacing/layout
  without any error, on pages that were never touched by the TS-import-based sweep.
- `scss/styles.scss` uses `@import` (not `@use`) for `@coreui/coreui/scss/coreui` and `@coreui/chartjs/scss/coreui-chartjs`;
  the file already has comments flagging this as blocked until CoreUI is gone.
- `scss/_theme.scss` and `default-layout.component.scss` depend on CoreUI CSS custom properties (`--cui-*`) and
  CoreUI Sass mixins (`ltr-rtl`, `transition`, `color-mode`) to style the app shell (sidebar/header/wrapper/footer).
  This is the single largest and riskiest remaining piece.
- `scss/components/tafel-badge.scss` falls back to `var(--cui-success, ...)` etc. — tied to CoreUI CSS vars.
- Three icon systems currently coexist: FontAwesome (primary, keep), Angular Material icons (`mat-icon`,
  6 spots), CoreUI icon set (`cil-*`, ~5 names via `IconDirective`/`IconSetService`, to be dropped).

## Breakdown by CoreUI feature area (file counts from current grep)

| # | Area | CoreUI symbols | Files | Replacement |
|---|------|-----------------|-------|--------------|
| 1 | Grid | `RowComponent`, `ColComponent` (`c-row`/`c-col`) | 60 | Tailwind flex/grid utilities |
| 2 | Buttons | `ButtonDirective` (`cButton`) | 48 | `mat-button`/`mat-raised-button`/`mat-stroked-button` (established) |
| 3 | Cards | `CardModule`, `CardComponent`, `CardHeaderComponent`, `CardBodyComponent`, `CardFooterComponent` | ~40 | `mat-card` family (established) |
| 4 | Forms | CoreUI `FormsModule`, `FormSelectDirective`, `FormCheckInputDirective`, `FormControlDirective`, `FormDirective`, `FormLabelDirective`, `FormCheckLabelDirective`, `FormCheckComponent` | 34 | Angular Material form fields |
| 5 | Modals | `ModalModule` | 9 (all `*.spec.ts`, stale) | Dead imports only — actual components already use `MatDialog`+`TafelDialogComponent`. Just delete. |
| 6 | App shell | `Sidebar*`, `Header*`, `Nav*`, `ContainerComponent`, `DropdownModule` | 2 core files + `app.config.ts` + `navigation-menuItems.ts` | Full Tailwind/custom rebuild — biggest single risk |
| 7 | Icons | `IconSetService`, `IconDirective`, `@coreui/icons` (`cil-*`) | ~5 icon names, in `navigation-menuItems.ts` + `default-header` | FontAwesome |
| 8 | Badge | `BadgeComponent`, `BadgeModule` | 2 (`default-header`, `scanner.component.ts`) | Existing `tafel-badge` scss classes |
| 9 | Avatar | `AvatarComponent`, `AvatarModule` | 1 (`default-header`) | Plain Tailwind markup |
| 10 | Table | `TableDirective`, `TableColorDirective` | 4 | Tailwind table classes |
| 11 | Progress | `ProgressModule` | 4 | Tailwind or `mat-progress-bar` |
| 12 | Statistics chart | `@coreui/angular-chartjs`, `@coreui/utils` (`getStyle`), `WidgetStatAComponent` | 1 (`statistics-panel.component.ts`) + `statistics.component.ts` | Plain `chart.js` + `mat-card`-based stat tile |
| 13 | Bootstrap utility classes | n/a (plain CSS class strings) | 47 (broader set, see above) | Tailwind equivalents, audited last |
| 14 | SCSS core | `@import` of CoreUI core/chartjs scss, `--cui-*` vars, CoreUI mixins | `styles.scss`, `_theme.scss`, `default-layout.component.scss`, `tafel-badge.scss` | Remove imports, rebuild shell CSS in Tailwind, replace var fallbacks |
| 15 | DI providers | `importProvidersFrom(SidebarModule, DropdownModule)`, `IconSetService` | `app.config.ts` | Remove once shell/icons migrated |
| 16 | Nav types | `INavData` base interface | `navigation-menuItems.ts` | Own local interface |

## Phased execution order

Ordered so early phases shrink CoreUI's footprint fast with low risk, and the riskiest/most entangled piece
(the app shell) comes only after everything else is proven working — at that point it's the only moving part.

**Phase 0 — Safety net**
- Confirm current Cypress e2e suite passes on `main`/current branch as a baseline.
- Decide final icon strategy: FontAwesome-only (recommended — already primary) vs. keeping `mat-icon` too.

**Phase 1 — Low-risk mechanical cleanup**
- Delete stale `ModalModule` imports from the 9 `*.spec.ts` files.
- Replace `BadgeComponent`/`BadgeModule` usage (2 files) with existing `tafel-badge` classes.
- Replace `AvatarComponent` in `default-header` with Tailwind markup.
- Replace remaining `cil-*` icons (`IconDirective`/`IconSetService`) with FontAwesome equivalents.

**Phase 2 — Buttons & Cards** (highest file count, but mechanical, pattern already established)
- Sweep `cButton` → `mat-button`/`mat-raised-button`/`mat-stroked-button` (48 files).
- Sweep Card* → `mat-card` family (40 files).
- Do this module-by-module (customer, user, logistics, dashboard, statistics) to keep diffs reviewable.

**Phase 3 — Grid system** (60 files, purely structural)
- Replace `c-row`/`c-col` with Tailwind flex/grid utilities.
- Write a short internal "grid cheatsheet" mapping (e.g. `c-row` → `flex flex-wrap`, `c-col md="6"` →
  `md:w-1/2` or `col-span-6` in a 12-col grid) *before* starting, so all 60 files land on one convention.

**Phase 4 — Forms** (34 files, includes the large `customer-form`/`user-form` components)
- Replace CoreUI form directives with Angular Material form fields, consistent with the
  `MAT_FORM_FIELD_DEFAULT_OPTIONS` already configured in `app.config.ts`.

**Phase 5 — Table & Progress** (4 files each)
- `TableDirective`/`TableColorDirective` → Tailwind table styling.
- `ProgressModule` → Tailwind or `mat-progress-bar`.

**Phase 6 — Statistics chart wrapper** (2 files, self-contained)
- Replace `@coreui/angular-chartjs` + `@coreui/chartjs` scss + `@coreui/utils.getStyle()` + `WidgetStatAComponent`
  in `statistics-panel.component.ts`/`statistics.component.ts` with plain `chart.js` + a `mat-card`-based stat tile.

**Phase 7 — App shell** (highest risk — do last of the component work)
- Rebuild `default-layout.component.{ts,html,scss}` and `default-header.component.{ts,html,scss}` without
  `Sidebar*`/`Header*`/`Nav*`/`ContainerComponent`/`DropdownModule`.
- Rebuild `navigation-menuItems.ts` without `INavData`/`cil-*` icon names.
- Remove `importProvidersFrom(SidebarModule, DropdownModule)` and the `IconSetService` provider from `app.config.ts`.
- Rebuild `_theme.scss` without `--cui-*` custom properties and CoreUI Sass mixins.

**Phase 8 — Bootstrap utility-class audit** (cross-cutting safety sweep, run across the *whole* codebase,
not just files touched above)
- Re-grep all templates for `fw-*`, `text-end`/`text-start`, `d-flex`/`d-none`/`d-block`, `justify-content-*`,
  `align-items-*`, `ms-*`/`me-*`, `py-*`/`px-*`, `g-*`, `container-fluid`, `row`/`col`, `form-*` and replace with
  Tailwind equivalents or delete.
- Pay special attention to class names that exist in **both** frameworks with different scale values
  (`mt-*`, `mb-*`, `row`, `col`) — these won't error, they'll silently change spacing. Visually diff key pages.

**Phase 9 — Remove CoreUI entirely**
- Delete all 7 `@coreui/*` packages from `package.json`, reinstall.
- Remove the two `@import` lines for CoreUI scss from `scss/styles.scss`.
- Replace `var(--cui-*, ...)` fallback colors in `tafel-badge.scss` with plain values.
- Full rebuild + lint + full Cypress run + manual visual pass through every top-level nav route.

## Verification per phase
- `npm run build-local` (catches TS import errors immediately)
- `npm run lint`
- `npm run test-ci`
- `npm run cy:run-ci-local` (existing suite is largely `testid`-attribute based, so should mostly survive
  class-name churn — but won't catch pure visual/spacing regressions)
- Manual visual check of touched pages after each phase, especially Phase 7 (shell) and Phase 8 (utility classes)

## Notes / open decisions
- Icon strategy (FontAwesome-only vs. keep `mat-icon` in the few spots it's used) — recommend deciding in Phase 0.
- Grid convention (12-col `grid-cols-12`/`col-span-*` vs. flex-based) should be picked once in Phase 3 and applied
  consistently rather than left to per-file judgment.

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

**Phase 1 — Low-risk mechanical cleanup** ✅ DONE (2026-07-17)
- Deleted stale CoreUI imports (`ModalModule`, `CardModule`, `ColComponent`, `RowComponent`, `ProgressModule`,
  `BgColorDirective`, `InputGroupComponent`, `IconSetService`, `cil*` icons) from **15** `*.spec.ts` files whose
  real component under test no longer had any CoreUI dependency — these were dead TestBed setup left over from
  earlier refactors, not just the originally-scoped 9 `ModalModule` files. Verified via a systematic pass
  comparing every `*.spec.ts` file importing `@coreui/*` against its sibling non-spec component file.
- Build, lint, and full unit test suite (493 tests) all green after cleanup.
- **Rescoped**: Badge/Avatar/icon replacement in `default-header` turned out to be inseparable from the rest of
  that file — `default-header.component.html` is a single monolithic CoreUI-shell template (`c-container`,
  `cHeaderToggler`, `cIcon`, `c-header-nav`, `c-badge`, `c-dropdown`, `c-avatar` all interleaved). Replacing
  badge/avatar/icon in isolation there would leave an inconsistent half-migrated file, so this work moved into
  **Phase 7** where the whole shell is rebuilt at once. Remaining genuinely-isolated icon usages (`cilArrowTop`,
  `cilSave` in the statistics module) stay scoped to **Phase 6**.

**Phase 2 — Buttons & Cards** ✅ DONE (2026-07-17)
- All `cButton` usages outside the shell/statistics converted to `matButton` (plain/`="filled"`/`="outlined"`),
  using `button-success`/`button-danger` CSS classes (already defined in `mat-button.scss`) for color parity.
- All `c-card` family usages converted to `mat-card`/`mat-card-header`/`mat-card-title`/`mat-card-content`/
  `mat-card-actions`.
- `c-dropdown` (used for action menus on `customer-detail` and `user-detail`, not just the header) converted
  to `mat-menu` + `[matMenuTriggerFor]` — this pattern wasn't in the original plan and is now the established
  replacement for CoreUI dropdowns outside the shell.
- Real scope turned out far smaller than the original file-count estimates (48/40 files) — those counts were
  inflated by dead CoreUI imports left in `*.spec.ts` test files after their components were already migrated
  (see Phase 1). Actual files needing changes: ~25.

**Phase 3 — Grid system** ✅ DONE (2026-07-17)
- `c-row`/`c-col` (and the plain Bootstrap `.row`/`.col-*` divs used in a few already-partially-migrated files)
  replaced with Tailwind `grid`/`flex` utilities as part of the same full-file passes as Phase 2, since splitting
  one file's grid conversion from its card/button conversion would mean touching the same lines twice.

**Phase 4 — Forms** ✅ DONE (2026-07-17)
- CoreUI form directives (`cFormControl`, `cSelect`, `cFormCheckInput`, `cLabel`, `c-input-group`/
  `cInputGroupText`, `c-form-check`) replaced with plain native elements (input/select/checkbox), **not**
  Angular Material form fields — kept the existing manual `is-invalid`/`is-valid`/`invalid-feedback` validation
  display as-is since that's Bootstrap CSS, not a CoreUI component dependency (left for Phase 8). Signal Forms
  (`[formField]`) and classic `ReactiveFormsModule` bindings were both left untouched — this migration doesn't
  change which forms API a component uses, only the surrounding markup.

**Phase 5 — Table & Progress** ✅ DONE (2026-07-17, as a byproduct of Phase 2)
- `TableDirective`/`TableColorDirective` (food-collection-recording-items-desktop) → plain `<table>` +
  Tailwind classes + `[ngClass]` for the row-color highlighting.
- No `ProgressModule` usage was found anywhere in the codebase by the time this phase was reached — already gone.

**Phase 6 — Statistics chart wrapper** ✅ DONE (2026-07-17)
- Replaced `@coreui/angular-chartjs`'s `c-chart`/`c-widget-stat-a` with `ng2-charts`' `BaseChartDirective` on a
  plain `<canvas baseChart>` inside a `mat-card`-based stat tile; `@coreui/utils.getStyle()` replaced with a
  fixed color value. `provideCharts(withDefaultRegisterables())` is registered at the statistics **route**
  level (not app-wide in `app.config.ts`) so Chart.js stays inside the lazy-loaded statistics chunk rather than
  growing the main bundle.
- Dropped the `@coreui/chartjs` scss import from `styles.scss` and the `cilSave` icon (→ FontAwesome `faSave`).
- The existing `statistics-panel.component.spec.ts` never called `detectChanges()`, so it never actually
  exercised Chart.js registration — added a render test (sets input data, calls `detectChanges()`, asserts a
  `<canvas>` exists) since a missing-registerables error is exactly the kind of thing that fails silently at
  runtime with no build/lint error.

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

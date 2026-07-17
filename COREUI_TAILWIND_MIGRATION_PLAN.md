# CoreUI → Tailwind/Material Migration Plan

Status: all 9 phases complete as of 2026-07-17, on branch `tailwind-migration`. CoreUI is fully removed from
the codebase and `package.json`. A real-backend visual QA pass (below) has since covered the authenticated
routes too. Remaining gap: the full Cypress suite hasn't run in this environment.

## Post-Phase-9 visual QA against a real backend (2026-07-17)

The Phase 8/9 visual verification only covered pages reachable without authentication (login, 404, 500).
To check the authenticated app (dashboard, customer/user search, settings, statistics, checkin), logged into
the already-running local backend (`admin`/`12345`, seeded via the `testdata` Flyway profile) using a
Playwright-driven headless Chrome session, since `ng serve`'s `proxy.conf.json` doesn't cover most API routes
(only `/api` and `/config.json` — auth and most other calls are bare paths that only work same-origin, i.e.
when the frontend is built into the backend's static resources).

To get a real baseline instead of guessing what's "supposed to" look different, checked out `main` (pre-migration,
100% CoreUI) into a git worktree, built its frontend, and temporarily swapped it into
`backend/build/resources/main/static` (backing up the branch's own build first) so the *same* running backend
could serve either version — then screenshotted the same routes against both and diffed. This surfaced two
real bugs from **Phase 7** (the shell rebuild), invisible to build/lint/tests since they're pure layout:

- **Sidebar was 360px instead of 256px.** Angular Material's own `.mat-drawer` CSS sets
  `width: var(--mat-sidenav-container-width, 360px)` **unlayered**. Tailwind's `w-64` utility lives inside
  `@layer utilities`. Per the CSS cascade-layers spec, unlayered rules always beat layered ones regardless of
  specificity or source order — so Material's 360px default silently won over `w-64`'s 256px every time,
  invisible in a screenshot with nothing to compare against. Fixed by setting
  `--mat-sidenav-container-width` directly (Material's own intended theming hook) in the new
  `default-layout.component.scss` instead of fighting the cascade.
- **Expandable nav items (`Benutzer`, `Einstellungen`) had no visual affordance.** They render as a clickable
  `<a>` with a click handler instead of a `routerLink`, but nothing in the markup indicated they were
  expandable — the original CoreUI sidebar showed a chevron. Added one (`faAngleRight`/`faAngleDown` toggling
  on `expandedItems()`) to `default-layout.component.ts`/`.html`.

Also checked, but confirmed **not** regressions (differences from `main` that are the intentional, expected
result of earlier migration phases converting CoreUI components to Material/Tailwind — not something to
revert): default button color (CoreUI's brand purple `#5856d6` → Angular Material's stock theme blue
`#005cbb` for buttons with no explicit `button-success`/`button-danger` override — happened in Phase 2), the
dashboard's uniform bright-purple `mat-card-primary` KPI tiles (present identically on `main`), and a
backend `HTTP 500 - For input string: "0,00"` toast + its overlapping-the-header positioning on the statistics
page (present identically on `main`, a pre-existing backend/toastr bug unrelated to this migration).

Verified via headless-Chrome screenshots (login, dashboard, customer search, user search, settings ×2,
statistics, checkin scanner) after the fixes, plus `build-local` + `lint` + `test-ci` (494 tests) staying
green throughout.

### Follow-up pass: remaining routes + two more cascade-layer bugs (same day)

`logistik/warenerfassung` and `anmeldung/annahme` initially redirected back to the dashboard. This turned out
to be unrelated to permissions — `admin`'s seeded `testdata` authorities already include `LOGISTICS` and
`CHECKIN` (in fact `admin` has every permission the app defines). Both routes' components have their own
`effect()` that redirects to `/uebersicht` whenever `getCurrentDistribution() === null`
(`checkin.component.ts`, `food-collection-recording.component.ts`) — a deliberate business-state gate, not an
auth gate. Started a distribution via the dashboard's "Tag starten" button (confirmed against `main` too,
same shared Postgres DB) and re-ran the same `main`-vs-branch worktree comparison for every remaining route.
This found two more real bugs, **both the same root cause as the sidebar-width bug**: Angular Material ships
each component's structural CSS as unlayered `<style>` tags injected at runtime (confirmed via
`document.styleSheets` — they're not part of the main bundled stylesheet at all, so nothing in this repo's
own SCSS can wrap them in a layer), so any Tailwind utility applied directly to a bare Material element for a
property Material also hardcodes gets silently discarded.

- **`<mat-divider>` margins were always 0**, regardless of the `m-*`/`my-*` class applied — Material's
  `.mat-divider` sets `margin: 0` unlayered, as a literal (not `var(...)`, so the `--mat-sidenav-container-width`
  trick doesn't apply here). Fixed differently this time: Tailwind's `!` important-modifier (`!m-4` instead of
  `m-4`) generates `margin: ... !important`, and per the CSS cascade-layers spec, **any** `!important`
  declaration — layered or not — outranks **any** non-important unlayered declaration. Applied to all 11
  `<mat-divider class="...">` usages across 7 files (`dashboard`, `passwordchange-form`, `checkin`, `scanner`,
  `ticket-screen-control`, `customer-search`, `shelter-edit-dialog`, `user-search`). Verified `h-full` on
  `mat-card` does *not* have the same problem first (Material's card CSS never sets height/width), rather than
  applying `!important` everywhere pre-emptively.
- **Three menu-trigger buttons had no dropdown affordance**: `customer-detail`'s "Daten ausdrucken" and "Bezug
  verlängern", and `user-detail`'s "Benutzer-Status ändern". All three use `matButton` +
  `[matMenuTriggerFor]` directly on the button with no visual indicator that it opens a menu (unlike CoreUI's
  `cButton`+`cDropdown`, which auto-added a caret). Not a functional bug — the `<mat-menu>` and all its items
  were fully intact, just undiscoverable. Added `▾` to the button text, matching the same character already
  used by `customer-detail`'s pre-existing `editCustomerToggleButton` split-button. (The header's avatar-menu
  trigger was deliberately left alone — icon-only "click the avatar" triggers don't conventionally need one.)

**A screenshot methodology pitfall worth recording**: `customer-edit`'s form initially looked like it was
missing its bottom section (`Gültig bis` field, `Anspruch prüfen`/`Speichern` buttons) compared to `main`.
This was **not a bug** — `mat-sidenav-content` manages its own internal scroll (`overflow-y: auto`,
`scrollHeight` 1138px vs `clientHeight` 900px), so `document.body.scrollHeight` never grows past the viewport
height and Playwright's `page.screenshot({ fullPage: true })` (which measures the document, not the actual
scrolling element) silently truncates anything below the fold. Confirmed by scrolling
`mat-sidenav-content` itself and re-screenshotting — all the content was there and reachable, exactly like
`main`. Worth remembering for any future screenshot-based check against this shell: measure/scroll the
`mat-sidenav-content` element specifically, not the page.

Routes now confirmed working end-to-end (post-distribution-start): dashboard (open state), customer search,
user search, both settings pages, statistics, checkin scanner, checkin annahme, checkin ticket-monitor
control, logistics warenerfassung, customer detail, user detail, customer create, user create, customer
duplicates. Rebuilt, re-ran `build-local` + `lint` + `test-ci` (494 tests) after every fix batch — all green
throughout. Not covered: any page needing customer/distribution data beyond what `testdata` seeds (e.g. a
distribution with real recorded food collections), and the full Cypress suite.

## Established target pattern (already proven in ~19 already-migrated files)

Don't invent a new design system — follow what's already there:
- **Angular Material** for structural/interactive widgets: `mat-card` (+`mat-card-header/title/content/footer`),
  `mat-dialog` (via the existing `TafelDialogComponent` wrapper), `mat-button`/`mat-raised-button`/`mat-stroked-button`,
  Material form fields (`MAT_FORM_FIELD_DEFAULT_OPTIONS` is already globally configured in `app.config.ts`).
- **Tailwind utility classes** for layout/spacing on top of that.
- **FontAwesome** (`@fortawesome/angular-fontawesome`) as the primary icon set — already used far more than
  CoreUI icons or `mat-icon`.
- **Custom `tafel-*` components** for shared composite pieces that need one canonical implementation:
  `tafel-dialog`, `tafel-badge` (scss classes), `tafel-banner`, `tafel-counter-input`, `tafel-toastr`.
- **`mat-paginator`** (Angular Material, out of the box) for pagination — replaced the custom `tafel-pagination`
  component; see `tafel-paginator-center` scss helper for the centered mobile/dialog variant and
  `getGermanPaginatorIntl()` in `app.config.ts` for German labels.

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

**Phase 7 — App shell** ✅ DONE (2026-07-17)
- Rebuilt `default-layout` and `default-header` using `MatSidenavModule` (replaces `c-sidebar`) and `mat-menu`
  (replaces `c-dropdown`, same pattern from Phase 2). The header hamburger toggles the sidenav's own open/closed
  state; a separate footer button toggles a collapsed/icon-only width — preserving CoreUI's two independent
  toggle affordances (visible vs. unfoldable) via a plain signal. This also fixes the icon-only collapsed mode's
  known text-truncation bug (see `TASKS.md`) as a side effect of not reusing CoreUI's implementation.
- `navigation-menuItems.ts` now defines its own `ITafelNavData` (no longer extends CoreUI's `INavData`) and uses
  FontAwesome icons instead of `cil-*` strings.
- Removed `SidebarModule`/`DropdownModule` providers and `IconSetService` from `app.config.ts`/`app.component.ts`
  — confirmed via full-codebase grep that no component references `@coreui/*` anywhere except the still-pending
  `styles.scss` import (Phase 9's job).
- Rebuilt `_theme.scss`/`_custom.scss`/`_scrollbar.scss`, dropping rules that only targeted CoreUI-generated
  class names or the now-unused CoreUI chartjs tooltip class / ngx-scrollbar (dropped in favor of
  `mat-sidenav`'s built-in scrolling), and replacing remaining `--cui-*` var references with plain values.
- Main bundle shrank from ~319KB to ~228KB gzipped now that CoreUI's Angular components are gone from the graph.
- Visual verification was partial: build/lint/494 tests pass and a headless-Chrome console check found no JS
  errors, but the app's `provideAppInitializer` blocks bootstrap on a login API call with no backend running in
  this environment, so the actual rendered shell was never visually confirmed in a browser this session.

**Phase 8 — Bootstrap utility-class audit** ✅ DONE (2026-07-17)
- Determined the actual collision rule from the compiled CSS rather than guessing: CoreUI/Bootstrap generates
  its utility classes (`fw-*`, `d-*`, `justify-content-*`, `align-items-*`, `m*-*`/`p*-*`/`gap-*` 0–5, `w-100`/
  `h-100`, `rounded`, `border`, `container`, ...) with `!important`, so any template class name that collides
  with one of those names is *already* silently rendering Bootstrap's value today, regardless of source order —
  Tailwind's own rule for that name is fully shadowed. This made the audit mechanical: extract every
  `!important`-flagged single-class rule from a real build's compiled CSS, cross-reference against every class
  actually used in every template (via `class=`, `[ngClass]`, `[class.x]`, `[class]` bindings), and for each
  real collision either rename to the Tailwind equivalent (`fw-bold`→`font-bold`, `d-flex`→`flex`,
  `justify-content-between`→`justify-between`, `flex-grow-1`→`grow`, `text-end`→`text-right`, `w-100`→`w-full`,
  `rounded`→`rounded-md`, ...) or, for the spacer scale, remap the index so the *rem value* is preserved
  (Bootstrap 0/1/2/3/4/5 = 0/.25/.5/1/1.5/3rem vs Tailwind's linear scale — only index 0/1/2 coincide, so
  3→4, 4→6, 5→12 for every `m*/p*/gap-*` combination). Where two rules for the same file would otherwise chain
  (e.g. an original `-3` mapping to `-4`, which is itself another rule's source), applied a single simultaneous
  pass per class token rather than sequential text substitution, to avoid double-converting.
- `.form-control`/`.form-label`/`.form-check-input`/`.is-invalid`/`.is-valid`/`.invalid-feedback` (left in place
  by Phase 4 on plain native inputs) needed real CSS, not a utility swap — added
  `scss/components/tafel-form.scss` (`@layer components`, same pattern as `tafel-badge.scss`) reproducing the
  exact computed styles (colors, validation icons, checkbox/radio checked-state SVGs) captured from a build with
  CoreUI still present, so ~50 form-field usages across the app needed no template changes at all.
- Bare `container` (2 files, error pages) doesn't exist in Tailwind's utility set the same way — replaced with
  `w-full max-w-6xl mx-auto`. Initial pass dropped Bootstrap's implicit `width:100%` and only added `max-w-6xl`;
  since the div is a flex item (not a plain block child) it collapsed to content width instead of filling the
  row, wrapping every word onto its own line. Caught by actually running the app (`ng serve` + headless Chrome
  screenshot) and comparing against the pre-edit render — added `w-full` back to fix.
- Bare `border` (no color utility) on 3 elements needed an explicit color to replace Bootstrap's forced
  `!important` border-color once removed; added `border-[#dbdfe6]` / `border-gray-300` to match. Where a color
  utility was already present alongside bare `border` (e.g. `border border-gray-300`), left as-is — that
  color was already the correct target and had simply been silently overridden by Bootstrap's `!important`.
  `text-danger` (1 usage) → `text-[#e55353]` (matches the existing `--cui-danger` value used elsewhere).
- Verified with `build-local` + `lint` + `test-ci` (494 tests, all green) after every batch, plus a real
  `ng serve` session with headless-Chrome screenshots of the login page and both error pages to visually
  confirm rendering — this is what caught the `container` regression above; a text-only/grep-based check would
  have missed it.

**Phase 9 — Remove CoreUI entirely** ✅ DONE (2026-07-17)
- Deleted all 7 `@coreui/*` packages plus the standalone `bootstrap` dependency (only present as CoreUI's peer
  requirement — confirmed unused via grep before removing) from `package.json`, ran `npm install`. This also
  surfaced that `@angular/animations` (used directly by `provideAnimationsAsync()` in `app.config.ts`) had never
  been an explicit dependency — it was only present because some now-removed package pulled it in transitively.
  Added it back explicitly; without it the build failed on an unresolved `@angular/animations/browser` import.
- Removed the one remaining `@import "@coreui/coreui/scss/coreui"` line from `scss/styles.scss` (the
  `@coreui/chartjs` one was already dropped in Phase 6) along with the now-dead `_variables.scss` partial
  (its only content, `$enable-deprecation-messages`, was a CoreUI Sass compile flag with nothing left to
  configure).
- Replaced every remaining `var(--cui-*, fallback)` with a plain value — not just in `tafel-badge.scss` as
  originally scoped, but also `mat-button.scss`, `mat-card.scss`, and `mat-dialog.scss`, found via grep for
  `--cui-`. Critically, several of the *written fallback values* were stale/wrong (copy-paste artifacts) —
  e.g. `badge-warning`/`badge-danger` in `tafel-badge.scss` both fell back to a green, and `--cui-success`'s
  real configured value (`#1b9e3e`) didn't match the `#2eb85c` fallback text used everywhere. Since `--cui-*`
  was still defined (just via a wrong-looking fallback) up to this point, those bugs were latent — using the
  written fallback verbatim would have introduced real color regressions (e.g. warning badges turning red).
  Rebuilt with CoreUI still present one more time and read the actual resolved `:root` values from the
  compiled CSS, then hardcoded *those*.
- Removing CoreUI's CSS also removed Bootstrap's reboot defaults that many templates relied on implicitly
  (never an explicit Tailwind class): headings collapsed to plain inherited text size/weight (Tailwind's
  preflight resets `h1`-`h6` to `font-size`/`font-weight: inherit`), `<hr>` lost its `1rem` vertical margin
  and `.25` opacity (Tailwind's preflight only sets `border-top-width:1px`, no margin/opacity), and `body`
  lost Bootstrap's dark blue-grey default text color (fell back to plain black). Restored all three as global
  rules in `_theme.scss`, using Bootstrap 5's actual default values (checked against CoreUI's own
  `_variables.scss`, temporarily installed to a scratch dir to confirm CoreUI hadn't customized them — it
  hadn't). Checked the other common reboot-reliance spots (`<ul>`/`<ol>` bullets, `<p>` margin, bare `<a>`
  links) by grepping every template — all existing usages already had explicit Tailwind classes, so no fix
  needed there.
- Caught the heading/body-color regression only by actually running the app (`ng serve` + headless-Chrome
  screenshot of the login page) and comparing against the Phase-8-era screenshot — build/lint/tests all stayed
  green throughout despite the visual break, since none of it is type- or logic-level.
- Verified: `build-local` (styles bundle dropped from ~355KB to ~46KB, confirming CoreUI's CSS is fully gone),
  `lint`, `test-ci` (494 tests, all green), and headless-Chrome screenshots of the login page, both error
  pages, and the password-change page (exercises `<ul class="list-disc">` and Material form fields) all
  matching the pre-removal rendering. The `<hr>`-margin/opacity fix itself couldn't be visually confirmed —
  no reachable-without-auth page uses a bare `<hr>` — so it rests on the compiled-CSS diff against Bootstrap's
  documented defaults rather than a live screenshot.
- **Not done**: the full Cypress suite and a manual pass through the authenticated top-level nav routes —
  both require a running backend (Postgres + the Spring Boot API via `docker-compose.yml`), which wasn't
  available in this session. Everything reachable without authentication (login, 404, 500, password-change)
  was visually verified; the remaining ~40 templates touched in Phase 8 were verified statically (compiled-CSS
  diffing against Bootstrap's known reboot rules) but not rendered in a browser. This mirrors the same gap
  Phase 7 flagged for the shell rebuild.

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

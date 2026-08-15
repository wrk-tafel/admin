# Migrating from FontAwesome to Material icons — evaluation

Analysis for [issue #3304](https://github.com/wrk-tafel/admin/issues/3304). It asks whether the
frontend's FontAwesome icons can be replaced with Material icons. This is an evaluation, not a
decision record — nothing here is decided, and acting on any of it needs its own ticket.

**Recommendation up front: possible, and worth doing — but only via per-icon SVGs, never via the
icon font.** Every one of the 82 FontAwesome icons in use has a Material Symbols counterpart, the
migration is mechanical, and both systems can coexist during it (they already do: most icons are
already rendered inside a `<mat-icon>` shell). What is *not* viable is the way Material icons are
usually consumed — a self-hosted ligature font — because the smallest such font is more than twice
the login page's entire 60 kB font budget ([§3](#3-the-font-route-fails-the-shell-gate)). The
per-icon-SVG route ([§4](#4-the-svg-route-fits-every-gate)) keeps the bundle characteristics
FontAwesome has today and shrinks the eager bundle. The real cost is not code but verification:
some 50 components change appearance, and the German user guide's screenshots show many of them
([§6](#6-migration-effort)).

## 1. What FontAwesome does today

Four direct dependencies (`@fortawesome/angular-fontawesome` 5.1.0,
`free-solid-svg-icons`/`free-regular-svg-icons`/`free-brands-svg-icons` 7.3.1) plus two transitive
ones (`fontawesome-svg-core`, `fontawesome-common-types`). Only the **solid** style is actually
used: no `free-regular` or `free-brands` import exists anywhere under `src/app`, so two of the four
packages are dead weight already.

The footprint, measured:

| What | Count |
|---|---|
| Components importing `FaIconComponent` (non-spec) | 51 |
| `<fa-icon>` usages in templates | 214 |
| Distinct icon constants | 82 (including aliases: `faSearch`=`faMagnifyingGlass`, `faRemove`=`faXmark`) |
| Bytes per icon definition | ~0.8–1.1 kB of JS (the SVG path as a string) |

Each component imports its icon constants and exposes them as `protected readonly` fields for the
template's `[icon]` binding. The icons tree-shake per component, so an icon used only by a lazy
route lives in that route's chunk — a property any replacement must keep.

Two facts that shape the options:

- **FontAwesome is already only the glyph source.** The dominant pattern wraps the icon in
  Material's shell: `<mat-icon><fa-icon [icon]="faUser"/></mat-icon>` (see
  `login.component.html`, `customer-form.component.html`, and most form-field prefixes). The app
  standardized on `mat-icon` for sizing/positioning long ago; this migration would swap what is
  *inside* the shell, not introduce a new one.
- **The FontAwesome runtime is in the eager bundle.** The login page is eager
  ([ADR-0037](adr/0037-eager-bundle-bounded-by-its-own-build-check.md)) and imports
  `FaIconComponent`, which drags `fontawesome-svg-core` (~150 kB source, partially tree-shaken)
  plus `angular-fontawesome`'s runtime (~100 kB source) into `main.js` for four small icons.

There is also a maintenance coupling: `angular-fontawesome` pins `@angular/core ^22.0.0`, so every
Angular major requires a matching release of that package before the framework can be bumped —
one more package on the Dependabot critical path.

Nothing else depends on FontAwesome: no Cypress selector, no SCSS rule and no `styles.scss` entry
references `fa-icon` or `.fa-*` classes. The migration surface is exactly the component templates,
their TS imports, and the unit specs that reference `FaIconComponent`.

## 2. What "Material icons" can mean

Three genuinely different products hide behind the name, and the choice matters more than it looks:

| Set | Delivery forms | Size | Coverage of our 82 icons |
|---|---|---|---|
| **Material Icons** (classic, frozen) | ligature font (`material-icons` npm), per-icon SVG (`@material-design-icons/svg`) | 128 kB woff2 (filled) | incomplete — no `csv`, no `barcode`, no `lock_person`, no `package_2` |
| **Material Symbols** (current, maintained) | variable ligature font (`material-symbols` npm), per-icon SVG (`@material-symbols/svg-400`) | 3.9 MB woff2 (outlined variable); SVGs 250–1,000 bytes each | complete — all 82 have a counterpart among its 7,798 outlined icons |
| **@ng-icons/material-*** | tree-shaken SVG constants + its own `<ng-icon>` component | per icon, like FontAwesome | complete |

`@ng-icons` is listed only for completeness: it would replace one third-party icon component with
another and bypass `mat-icon`, which defeats the presumed point of the issue (one icon system,
Material's). It is not considered further. The classic set's coverage gaps rule it out too — the
source has to be **Material Symbols**, and the only question is font versus SVG.

## 3. The font route fails the shell gate

The idiomatic Material way — load an icon font, write `<mat-icon>home</mat-icon>` — is the route
that does *not* work here, for reasons this repository has already written down:

- **The font budget has no room.** `lighthouserc.cjs` errors the shell audit at
  `resource-summary:font:size` > 60 kB, and the login page already spends most of that on the
  three self-hosted Roboto weights (~22 kB each, `@fontsource/roboto` latin subsets). The classic
  Material Icons font is 128 kB on its own; the Material Symbols variable font is 3.9 MB. Either
  one more than doubles (or multiplies by ~70) what the gate allows, on a page that renders four
  icons. A CDN load instead of self-hosting is not an out — the app deliberately serves its fonts
  itself, and the bytes count the same.
- **Subsetting is possible but buys a fragile pipeline.** A build step (`pyftsubset`/
  `subset-font`) could shrink the font to the ~82 used glyphs (~5–10 kB), but ligature subsetting
  must preserve the substitution tables, the used-icon list becomes one more thing to maintain by
  hand, and the failure mode is silent and ugly: a glyph missing from the subset renders as its
  ligature *text* (`delete_forever` spelled out in the button). Nothing in CI would catch that —
  it is exactly the class of quiet breakage the eager-bundle check
  ([ADR-0037](adr/0037-eager-bundle-bounded-by-its-own-build-check.md)) exists to avoid.
- **Ligature text is also the FOUC.** Until the font arrives, every icon shows its name as text,
  which moves layout — against a `cumulative-layout-shift` error threshold of 0.1 on the shell
  audit. Mitigable (`font-display: block`, fixed icon boxes), but it is one more thing the font
  route must get right that the SVG route cannot get wrong.

## 4. The SVG route fits every gate

`@material-symbols/svg-400` ships every Material Symbols icon as a standalone 24×24 SVG file,
250–1,000 bytes each — *smaller* than FontAwesome's ~1 kB path definitions. The mechanics:

1. **Import SVGs as strings.** The `@angular/build:application` builder supports a `loader`
   option; `"loader": { ".svg": "text" }` in `angular.json` plus a one-line
   `declare module '*.svg'` typing makes
   `import homeIcon from '@material-symbols/svg-400/outlined/home.svg'` a plain string constant —
   bundled, minified and tree-shaken exactly like a FontAwesome icon constant is today. No
   generator script, no assets folder, no HTTP fetches at runtime.
2. **Register with `MatIconRegistry.addSvgIconLiteral`** and render as
   `<mat-icon svgIcon="home"/>`. Registration belongs next to use — in the component, or as a
   small route-level provider for a feature's shared icons; `shell.routes.ts` is already the
   documented home for per-route Material defaults. What to avoid is one global registry of all
   82 icons in `main.js`: that would move every lazy icon into the eager bundle, the one
   regression the eager-bundle check would actually flag.

What this buys, concretely:

- **The eager bundle shrinks.** The login page trades the FontAwesome runtime plus
  `angular-fontawesome` for four sub-kilobyte strings and Material's own `MatIconRegistry`
  (already partially present via `MatIcon`). The `check-eager-bundle.cjs` number goes down, not up.
- **The lazy-chunk profile is unchanged.** ~82 SVGs at ~0.5 kB each is ~40 kB raw spread across
  the same chunks the FontAwesome definitions occupy now — slightly less than what they replace.
- **Two icon languages become one.** FontAwesome's solid glyphs currently sit inside Material
  form fields, buttons and menus; after the migration the glyph style matches the component
  library it lives in.
- **Four dependencies (plus two transitive) leave `package.json`**, one of them on the
  every-Angular-major critical path. `@material-symbols/svg-400` is ~13 MB in `node_modules`, but
  that is install-time weight only — nothing but the imported files reaches any bundle.

Accessibility is parity, not regression: both `fa-icon` and `mat-icon` render `aria-hidden`
decorative icons by default, and the existing rule that interactive icons need a real focusable,
labelled `<button>` (see the comments in `login.component.html`) is about the wrapper, which does
not change.

## 5. Icon mapping

All 82 icons have a Material Symbols counterpart; most mappings are obvious
(`faPlus`→`add`, `faCheck`→`check`, `faTrashCan`→`delete`, `faMagnifyingGlass`→`search`,
`faTriangleExclamation`→`warning`, `faPencil`→`edit`). The ones that need a decision rather than a
lookup:

| FontAwesome | Material Symbols | Note |
|---|---|---|
| `faVenusMars` | `wc`, `male`+`female`, or `transgender` | no combined venus-mars glyph exists; the gender form-field prefix needs a judgment call |
| `faFileCsv` | `csv` | Symbols-only (one of the icons ruling out the classic set) |
| `faBoxOpen` | `package_2` or `inventory_2` | no open-box glyph |
| `faDiamondTurnRight` | `directions` | navigation/route-guidance actions |
| `faMobileScreen` | `mobile_2` | Google renamed `smartphone` in current Symbols releases |
| `faBarcode` | `barcode` | Symbols-only |
| `faClockRotateLeft` | `history` | the "Verlauf" tab |
| `faUpRightAndDownLeftFromCenter` / `faExpand` | `open_in_full` / `fullscreen` | ticket screen |
| `faGripVertical` | `drag_indicator` | the reorder handle in the settings tables |

A migration PR should carry the full 82-row mapping in its description so reviewers judge the
semantic choices once, not per file.

## 6. Migration effort

The change is wide but mechanical, and — because the hybrid state already exists — divisible:

- **51 components, 214 template usages**: replace
  `<mat-icon><fa-icon [icon]="faX"/></mat-icon>` with `<mat-icon svgIcon="x"/>`, drop the TS
  icon fields and imports, add the registration. The bare `<fa-icon>` usages (outside a
  `mat-icon` shell) additionally need a sizing check — `mat-icon` has a fixed 24px box where
  `fa-icon` sized with the surrounding text.
- **Unit specs** referencing `FaIconComponent` change with their components. **No Cypress spec
  changes**: nothing in `cypress/` selects by icon.
- **Verification is the real cost.** Icon swaps are exactly the class of change unit tests cannot
  see; every screen needs eyes on it, and the Lighthouse `pages` sweep plus the e2e suite's axe
  checks only confirm nothing *broke*, not that the new glyph reads right. The German user guide's
  screenshots show FontAwesome glyphs on most screens, so a full migration also means regenerating
  a large share of `docs/userguide/images/` — budget for it in the same ticket per the user-guide
  rules, or the guide and the product disagree visibly.
- **Do it per feature module, not big-bang.** One PR for the plumbing (`angular.json` loader,
  typing, first migrated module — `common/`, which covers the eager bundle win) and one per
  feature module afterwards keeps each diff reviewable and each screenshot batch small. The
  mixed state in between is no worse than today's.

## 7. When this should be revisited

- **If the shell font budget is ever raised substantially** (e.g. because the app moves to a
  variable Roboto font and frees headroom), the subsetted-font route becomes worth re-costing —
  it is the lower-maintenance end state once the subsetting pipeline exists.
- **If Angular Material ships first-party Material Symbols integration** that registers symbols
  without a font, adopt that over the hand-rolled `addSvgIconLiteral` registration.
- **If FontAwesome's Angular package lags an Angular major** (the coupling in
  [§1](#1-what-fontawesome-does-today)), that turns this migration from a consistency win into
  the unblocker for a framework upgrade — priority changes accordingly.

## References

- `frontend/src/main/webapp/package.json` — the four `@fortawesome` dependencies
- `frontend/src/main/webapp/lighthouserc.cjs` — the 60 kB `resource-summary:font:size` shell gate
- `frontend/src/main/webapp/check-eager-bundle.cjs` and [ADR-0037](adr/0037-eager-bundle-bounded-by-its-own-build-check.md)
- `frontend/src/main/webapp/src/app/common/views/login/login.component.html` — the `mat-icon`-wrapping-`fa-icon` pattern, and the interactive-icon accessibility rule
- [ADR-0036](adr/0036-page-performance-index-in-the-pipeline.md) — the Lighthouse gates a font would have to pass

# Migrating custom styling to Angular Material's own theming tooling — evaluation

Analysis for [issue #3306](https://github.com/wrk-tafel/admin/issues/3306). It asks whether the
frontend's custom styling can be expressed with Angular Material's out-of-the-box tooling instead —
naming the `color="primary"`/`color="warn"` inputs as one candidate and asking for a check of the
rest. This is an evaluation, not a decision record — nothing here is decided, and acting on any of
it needs its own ticket.

**Recommendation up front: yes for the token layer, and the audit itself is the argument.** The
right OOTB tool is not the `color` input — that API is dead under the M3 theme in use
([§2](#2-the-color-input-is-dead-api-under-this-theme)) — but the `mat.<component>-overrides()`
Sass mixins, which emit exactly the token custom properties the stylesheets already write by hand,
with the names validated at compile time. Auditing every hand-written token against the installed
Material 22 found two that are already silently dead (the tooltip font-size/line-height overrides)
and one input that never had an effect (the password-strength bar's `[color]`) — precisely the
failure mode the mixins turn into a build error ([§3](#3-what-the-audit-found-already-broken)).
The conversion is mechanical, changes nothing visually except the two bug fixes, and removes the
`!important` state-fighting in `mat-button.scss` along the way ([§4](#4-the-mechanical-migration)).
Replacing the prebuilt theme with `mat.theme()` is a genuinely separate, larger step and should
stay one ([§5](#5-the-larger-step-mattheme-instead-of-the-prebuilt-css)).

## 1. What custom styling exists today

`src/scss/` holds 517 lines across 17 files (`angular-material-theme.scss` plus
`components/`), in three distinct categories:

| Category | Files | Mechanism |
|---|---|---|
| Material component overrides | `mat-button-toggle`, `mat-card`, `mat-dialog`, `mat-menu`, `mat-paginator`, `mat-stepper`, `mat-table`, `mat-tooltip`, `tafel-snackbar` | ~29 hand-written `--mat-*`/`--mdc-*` token custom properties |
| Material overrides with no token equivalent | `mat-button`, `mat-menu`, `mat-tabs`, `mat-tooltip`, `mat-paginator`, `mat-button-toggle` | raw CSS rules on Material's internal classes, several `!important` |
| App-own utilities (not Material) | `tafel-badge`, `tafel-banner`, `tafel-panel`, `tafel-inactive`, `tafel-info-tooltip`, `tafel-app-loading` | Tailwind-layer classes on the severity palette from `_theme.scss` |

The codebase already leans on Material's OOTB tooling wherever it was picked up over time: the
theme is the prebuilt M3 `azure-blue.css`, density comes from `mat.form-field-density(-4)`,
component defaults sit in `app.config.ts` providers (`MAT_DIALOG_DEFAULT_OPTIONS`,
`MAT_FORM_FIELD_DEFAULT_OPTIONS`, `MAT_CARD_CONFIG`), and most override files deliberately set
Material's token custom properties instead of fighting the cascade — their own comments say so.
So this migration is a refinement of an existing direction, not a rescue: the one thing the
hand-written properties lack is any check that the names are still the ones the installed version
reads.

## 2. The `color` input is dead API under this theme

The issue suggests migrating `color="primary"`/`color="warn"` usages. There is nothing to migrate
*to*: the app runs an M3 theme, and the installed Material 22 documents the input — on button and
progress bar alike — as

> Theme color of the button. This API is supported in M2 themes only, it has no effect in M3
> themes.

Concretely, `azure-blue.css` contains **zero** `.mat-primary`/`.mat-accent`/`.mat-warn` rules, so
the classes the input toggles style nothing. Exactly two usages exist:

- `ticket-screen-control.component.html`: `color="primary"` on a `mat-flat-button` — a dead
  attribute. Filled buttons render in the primary color by default; deleting it changes nothing.
- `passwordchange-form.component.html`: `[color]` switching `warn`/`accent`/`primary` with password
  strength — a **live defect**. The strength bar renders in the primary azure at every strength;
  the red/amber/blue coding the binding intends has never worked under this theme. The OOTB fix is
  three severity classes carrying `mat.progress-bar-overrides((active-indicator-color: ...))`
  ([§4](#4-the-mechanical-migration)).

Material does ship `mat.color-variants-backwards-compatibility()`, which re-emits component tokens
under the `.mat-warn`/`.mat-accent` classes to revive the input. It is the wrong tool here: it is a
compatibility shim for M2→M3 transitions, needs a Sass theme object (the app imports a prebuilt
CSS file), and resurrects the variant styles globally for two call sites. Class-scoped override
mixins do the same job at the two places that need it.

## 3. What the audit found already broken

Every hand-written token was checked against the installed version's token maps. Result: all are
still read — except in `mat-tooltip.scss`, where both token overrides are dead:

| Written today | Read by Material 22 | Effect |
|---|---|---|
| `--mdc-plain-tooltip-supporting-text-size` | `--mat-tooltip-supporting-text-size` | tooltip font-size override silently inoperative |
| `--mdc-plain-tooltip-supporting-text-line-height` | `--mat-tooltip-supporting-text-line-height` | line-height override silently inoperative |

Material renamed its `--mdc-*` token prefixes; the custom properties kept their old names and kept
compiling, so the sentence-length tooltips that file exists for (income limits, validity dates)
have quietly fallen back to Material's label-sized 12px type. The same file's raw
`max-width`/`white-space` rules on `.mdc-tooltip__surface` still work — that class survived — which
is why nothing looked obviously broken.

This is the maintenance argument in one example: a hand-written custom property is a string
Material never sees; the override mixins hard-error on a name the installed version doesn't know
(`Error: Invalid token name ...`), so the next rename breaks the build instead of the tooltips.

## 4. The mechanical migration

`@angular/material` 22 exports an `-overrides()` mixin for every themable component
(`mat.card-overrides`, `mat.dialog-overrides`, `mat.menu-overrides`, ...). Each takes a map of
token names — validated against the installed version — and emits the same custom properties under
whatever selector wraps the include. The conversion is therefore selector-for-selector,
value-for-value; no visual change is intended anywhere except the two [§2](#2-the-color-input-is-dead-api-under-this-theme)/[§3](#3-what-the-audit-found-already-broken)
bug fixes. Example, `mat-card.scss`:

```scss
:root {
  --mat-card-outlined-container-color: white;
  --mat-card-outlined-outline-color: var(--tafel-border-color);
}
```

becomes

```scss
:root {
  @include mat.card-overrides((
    outlined-container-color: white,
    outlined-outline-color: var(--tafel-border-color),
  ));
}
```

The same one-to-one rewrite covers `mat-button-toggle`, `mat-dialog`, `mat-menu` (its
menu/select/autocomplete blocks split across `mat.menu-overrides`, `mat.select-overrides`,
`mat.autocomplete-overrides`), `mat-paginator`, `mat-stepper`, `mat-table`, `mat-tooltip` (which
gets its dead tokens back as working `supporting-text-size`/`supporting-text-line-height`), and
`tafel-snackbar.scss` (`mat.snack-bar-overrides` inside the existing panel-class selector, keeping
the per-severity scoping).

Two files gain more than a syntax swap:

- **`mat-button.scss`'s severity classes** currently force `background-color`/`color` with
  `!important` and re-assert them for `:hover`/`:focus`/`:active`. Material's filled-button
  structural CSS draws the container from `filled-container-color` and paints hover/focus/pressed
  as a translucent state layer *over* it — so a class-scoped override needs no state selectors and
  no `!important` at all:

  ```scss
  .button-danger {
    @include mat.button-overrides((
      filled-container-color: var(--tafel-severity-danger),
      filled-label-text-color: white,
      filled-state-layer-color: white,
      filled-ripple-color: rgba(white, 0.1),
      outlined-label-text-color: var(--tafel-severity-danger),
      outlined-outline-color: var(--tafel-severity-danger),
    ));
  }
  ```

  (Token names verified against the installed version's button token map.) The blanket
  `box-shadow: none !important` stays a raw rule or moves to the per-appearance
  `*-container-elevation` tokens — either works; the raw rule is one line, the tokens are four.
- **`mat-card.scss`'s `.mat-card-primary/-warning/-danger/-success`** map to
  `mat.card-overrides((outlined-container-color: ...))` under each class, dropping their
  `!important`s the same way. These class names squat on Material's `mat-` prefix; renaming them
  `tafel-card-*` would be honest, but that is cosmetic churn across 12 template usages and
  orthogonal to this migration — decide it separately.

**What deliberately does not convert:** every rule the existing comments already flag as having no
token equivalent — the menu/select/autocomplete panel borders, the select panel's hardcoded
border-radius, the menu's zero content padding and item heights, the tab group's card-look border
and native header scrolling (#3024), the tab body padding, the tooltip's `max-width`/`white-space`,
the button-toggle wrapping, the paginator alignment helpers. Those stay raw CSS, and the severity
palette itself stays in `_theme.scss`: M3's system roles offer only `error` — there is no
success/warning/info role to migrate `--tafel-severity-*` onto, and that palette's exact values are
load-bearing for the WCAG AA contrast the `lighthouse` gate enforces.

## 5. The larger step: `mat.theme()` instead of the prebuilt CSS

The remaining pattern in the override files is one decision repeated per component: *surfaces are
white here, not M3's tinted surface-container*. Card, menu, select, autocomplete, paginator, table
and tabs each override their background to white individually. Replacing the prebuilt
`azure-blue.css` import with the `mat.theme()` Sass API would allow stating that once —
`mat.theme-overrides()` can redefine the `--mat-sys-surface*` system tokens (the documented public
token layer) so every component inherits white from the theme instead of being corrected after the
fact. It would also open up a real brand palette instead of stock azure, and put typography and
density in the same declaration `mat.form-field-density` patches today.

It is not part of the mechanical migration, on purpose:

- **The blast radius is every screen at once.** Redefining a system token restyles components that
  were never individually overridden (form fields, chips, expansion panels, ...), so the whole app
  needs eyes on it — including the German user guide's screenshots if anything shifts visibly. The
  [§4](#4-the-mechanical-migration) conversion has none of that risk.
- **The current state has to be reproduced first.** `mat.theme()` with the azure palette should
  emit the same `--mat-sys-*` values `azure-blue.css` ships, but "should" is exactly what the
  verification pass exists to confirm.
- **The win is consolidation, not capability.** Everything the per-component overrides do today
  keeps working; this step only moves where the "white surfaces" decision lives.

If it is taken up, it is its own ticket with its own before/after sweep.

## 6. Suggested sequencing

1. **Fix what is silently broken** (small, ships alone —
   [#3311](https://github.com/wrk-tafel/admin/issues/3311)): drop the dead `color="primary"`
   attribute, give the password-strength bar working severity colors via class-scoped
   `mat.progress-bar-overrides`, and restore the tooltip sizing via `mat.tooltip-overrides`. The
   strength bar's color coding is user-visible behavior, so it needs its Cypress assertion and a
   user-guide check.
2. **Convert the token files to override mixins** (mechanical): one PR, file-for-file,
   value-for-value, zero intended visual change. Verification is visual plus the existing
   Lighthouse/axe gates — unit suites cannot see styling, per the repo's own testing rules.
3. **Optionally, `mat.theme()`** ([§5](#5-the-larger-step-mattheme-instead-of-the-prebuilt-css)) —
   separate ticket, separate decision.

## References

- `frontend/src/main/webapp/src/scss/` — the 17 stylesheet files inventoried in [§1](#1-what-custom-styling-exists-today)
- `frontend/src/main/webapp/src/app/common/views/passwordchange-form/passwordchange-form.component.html` — the inoperative `[color]` binding
- `frontend/src/main/webapp/src/app/modules/checkin/views/ticket-screen-control/ticket-screen-control.component.html` — the dead `color="primary"` attribute
- `node_modules/@angular/material/types/button.d.ts` / `progress-bar.d.ts` — the "M2 themes only" API documentation quoted in [§2](#2-the-color-input-is-dead-api-under-this-theme)
- [Angular Material theming guide](https://material.angular.dev/guide/theming) — `mat.theme()`, system tokens as public API, and the per-component `-overrides()` mixins
- [ADR-0036](adr/0036-page-performance-index-in-the-pipeline.md) — the Lighthouse accessibility gate the severity palette's contrast pairs exist for

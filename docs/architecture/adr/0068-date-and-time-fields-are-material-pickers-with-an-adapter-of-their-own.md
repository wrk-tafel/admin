# ADR-0068: Date and time fields are Material pickers with a date adapter of their own

**Status:** accepted · **Recorded:** 2026-10-12

## Context

Every date field was a native `<input type="date">`, every time field an `<input type="time">`. A
browser renders those in the language *it* runs in — not the operating system's regional settings,
not the page's `lang="de"`, not Angular's `LOCALE_ID`. On a Linux PC whose desktop was set to
Austrian formats but whose browser ran in English, every date field therefore read `mm/dd/yyyy` and
every time field would have offered AM/PM, while every date the application printed as text
(`de-DE`) read `dd.MM.yyyy` right next to it. A birth date entered as `03/04/1980` on such a
machine is a wrong date nobody notices.

The application cannot influence that rendering, so the only fix on its side is not to use the
native widgets. That choice is constrained by three things already in the code: date values are held
three different ways (`Date` in signal forms, ISO strings in filters that live in the URL, `HH:mm`
strings for times), the eager bundle is bounded by a build check (ADR-0037), and operators type birth
dates all day, so keyboard entry has to stay at least as fast as it was.

## Decision

Date fields are `matDatepicker` inputs and time fields are `matTimepicker` inputs, both behind one
date adapter of the application's own.

- `common/date/tafel-date-adapter.ts` holds `TafelDateAdapter` (a `NativeDateAdapter` whose input
  format is `dd.MM.yyyy` / 24-hour `HH:mm`, produced and parsed by the adapter itself rather than by
  `Intl`), the matching `MAT_DATE_FORMATS`, and `provideTafelDateAdapter()`, which bundles them with
  the German `MatDatepickerIntl` and `MAT_DATE_LOCALE`.
- Parsing accepts what is typed here: `24.12.2026`, `1.2.26`, digits only (`24122026`), and ISO
  `2026-12-24` for pasted values. A two-digit year means this century unless that is more than ten
  years ahead. Times also read `1430`, `930` and a bare hour.
- `provideTafelDateAdapter()` is a route-level provider in `shell.routes.ts`, which keeps it out of
  the eager bundle. A dialog with a date or time field lists it in its own `providers`.
- Values that travel as strings are converted at the edge with `common/date/date-values.ts`; a
  field's own value is always a `Date`.
- `ParseErrorRefreshDirective` attaches itself to every picker input bound with `[formField]`, so a
  signal form reports text that is not a date as "Ungültiges Datum" (`signal-form-helper.ts` maps
  the pickers' own error kinds to messages).

## Consequences

The format no longer depends on the machine, and the calendar popup, its labels and the first day of
the week are German everywhere. Keyboard entry got more forgiving than the native field's fixed
segments.

What contributors now have to remember, none of which fails loudly:

- **Import `MatDatepicker`, `MatDatepickerInput` and `MatDatepickerToggle`, not
  `MatDatepickerModule`.** The module provides `MatDatepickerIntl` again; a standalone component
  importing it gets that English copy instead of the German one from the route.
- **A dialog needs `provideTafelDateAdapter()` in its `providers`.** `MatDialog` creates dialogs
  under the root injector. Forgetting it does fail loudly (no `DateAdapter`), which is why the
  adapter and the labels come from one function.
- **A signal-form screen needs `ParseErrorRefreshDirective` in its `imports`.** Without it, text
  that is not a date leaves the field's value empty and the form says "Pflichtfeld" — or, on an
  optional field, nothing at all. The cause is that `matDatepicker` asks a form to re-validate by
  handing it the value again, which is `null` before and after, so a signal form has nothing to
  react to.
- **A field bound with `[ngModel]` must hand the picker back the very `Date` it emitted.** A new
  `Date` for the same day counts as a change, and the picker rewrites the text while it is still
  being typed. Filters whose truth is an ISO string (audit log, statistics range) therefore bind
  `[value]` / `(dateChange)` instead, which also means they apply when a date is complete rather
  than per keystroke.
- A component spec with a picker has to provide `provideTafelDateAdapter()` itself; the global test
  providers file cannot import Angular Material.

On a phone the device's own date wheel is gone; Material's calendar opens instead. The lazy chunks
grow by the datepicker and timepicker (about 45 kB of script in total); the eager bundle is
unchanged.

## Alternatives considered

- **Leave the native inputs and have operators set their browser's language to German.** Fixes one
  machine at a time, and nothing tells anyone that a machine needs fixing.
- **A plain text input with a `TT.MM.JJJJ` parsing directive, no calendar.** Would have carried the
  same parsing and the same number of changed templates, minus the calendar and its accessible
  labelling, which would then have been ours to build for "Gültig bis" and the date-range filters.
- **Material's stock `NativeDateAdapter` with `MAT_DATE_LOCALE`.** Displays `dd.MM.yyyy`, but parses
  with `Date.parse`, which reads `01.02.2026` as the 2nd of January or not at all.
- **A date-library adapter (`@angular/material-luxon-adapter`, `-date-fns-adapter`).** A second date
  library next to dayjs for two formats; there is no first-party dayjs adapter.
- **Providing the adapter app-wide in `app.config.ts`.** Would spare dialogs their own `providers`
  entry at the price of putting the adapter into the bundle the login page loads (ADR-0037).

## References

- `frontend/src/main/webapp/src/app/common/date/`
- `frontend/src/main/webapp/src/app/shell.routes.ts`
- `frontend/src/main/webapp/src/app/common/util/signal-form-helper.ts`
- [ADR-0027](0027-single-locale-and-timezone.md) — the one locale this makes the input fields follow
- [ADR-0037](0037-eager-bundle-bounded-by-its-own-build-check.md)
- User guide: `docs/userguide/README.md`, "Datum und Uhrzeit eingeben"

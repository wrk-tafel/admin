# Frontend Build Error Remediation Plan

Generated: 2026-07-17, branch `update-angular`, via `npm run dev` (`ng serve --configuration=development`) in `frontend/src/main/webapp`.

## Summary

The dev server compiles and serves (watch mode reaches "Watching for file changes..."), but the initial build reported **452 diagnostics: 449 errors + 3 warnings across 54 files**. Almost all of them are variations of the same root cause: **strict null/undefined checking** is now effectively enforced across the app (component TS code, HTML templates via strictTemplates, and reactive-forms typing) as a side effect of the Angular 22 / TypeScript 6.0.3 upgrade on this branch. Code that used to freely mix `null`/`undefined` with non-nullable model types (`string`, `number`, `boolean`, custom interfaces) now fails type-checking.

Two errors are unrelated tooling/config issues, not app code:
- `TS5101` — tsconfig `baseUrl` is deprecated in TS 6.x.
- `TS2307` — a broken type import inside `@coreui/angular`'s own `.d.ts` (third-party package issue, not ours).

## How to resume this work

1. From `frontend/src/main/webapp`, run `npm run dev` (or `npx ng build`) to reproduce the current error list.
2. Work through the checklist below **one item at a time** (check the box after fixing), re-running the build periodically to confirm the count shrinks and no new errors appear.
3. Fixing the underlying model/property nullability in a `.ts` file typically clears several related template (`.html`) errors for the same component — so within a "file group" below, fix the `.ts` file before the `.html` file.
4. Prefer fixing the actual type contract (make the property genuinely optional/nullable, or ensure a non-null value is always provided) over sprinkling `!` non-null assertions — but a `!`/`?.`/nullish-coalescing is fine for cases that are truly guarded by surrounding logic.

## Suggested order of attack (grouped by file, highest error count first)

Fixing file-by-file is more efficient than type-by-type, since one component's errors usually share one root cause (e.g. a form model whose fields shouldn't be nullable, or a signal that can be `undefined` before data loads).

- [x] `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.{ts,html}` — 102 errors (fixed 2026-07-17)
- [x] `customer/components/customer-form/customer-form.component.{ts,html}` — 76 errors (fixed 2026-07-17)
- [x] `logistics/components/dialogs/create-employee-dialog.component.{ts,html}` — 42 errors (fixed 2026-07-17)
- [x] `checkin/views/checkin/checkin.component.{ts,html}` — 28 errors (fixed 2026-07-17)
- [x] `customer/views/customer-detail/customer-detail.component.{ts,html}` — 27 errors (fixed 2026-07-17)
- [x] `customer/views/customer-duplicates/customer-duplicates.component.{ts,html}` — 21 errors (fixed 2026-07-17)
- [x] `customer/views/customer-search/customer-search.component.{ts,html}` — 25 errors (fixed 2026-07-17)
- [x] `logistics/views/food-collection-recording-items-responsive/food-collection-recording-items-responsive.component.{ts,html}` — 17 errors (fixed 2026-07-17)
- [x] `dashboard/components/distribution-statistics-input/distribution-statistics-input.component.{ts,html}` — 15 errors (fixed 2026-07-17, includes the separately-listed 4 html errors below)
- [x] `statistics/statistics.component.{ts,html}` — 13 errors (fixed 2026-07-17)
- [x] `customer/views/customer-edit/customer-edit.component.ts` — 7 errors (fixed 2026-07-17)
- [x] `logistics/views/food-collection-recording-items-desktop/food-collection-recording-items-desktop.component.{ts,html}` — 8 errors (fixed 2026-07-17)
- [x] `common/views/passwordchange-form/passwordchange-form.component.html` — 6 errors (fixed 2026-07-17)
- [x] `settings/components/mail-recipients/mail-recipients.component.{ts,html}` — 9 errors (fixed 2026-07-17)
- [x] `user/components/user-form/user-form.component.ts` — 6 errors (fixed 2026-07-17)
- [x] `dashboard/dashboard.component.html` — 5 errors (fixed 2026-07-17, also fixed `dashboard/components/registered-customers/registered-customers.component.{ts,html}` as a side effect — root cause was a stray `?` on `count? = input<number>()`)
- [x] `common/security/authentication.service.ts` — 4 errors (fixed 2026-07-17)
- [x] `user/views/user-detail/user-detail.component.{ts,html}` — 6 errors (fixed 2026-07-17)
- [x] `checkin/services/qrcode-reader/qrcode-reader.service.ts` — 3 errors (fixed 2026-07-17)
- [x] `checkin/views/scanner/scanner.component.{ts,html}` — 4 errors (fixed 2026-07-17)
- [x] Remaining small/one-off files (fixed 2026-07-17; also required touching a few not originally listed as knock-on effects — `statistics/components/statistics-panel.component.{ts,html}`, `common/views/default-layout/default-layout.component.ts`, `dashboard/components/distribution-state/distribution-state.component.ts`, `api/distribution-api.service.ts`):
  - `common/components/tafel-counter-input/tafel-counter-input.component.html`
  - `common/pipes/format-customer-address.pipe.ts`
  - `common/pipes/format-shelter-address.pipe.ts`
  - `common/state/global-state.service.ts`
  - `common/views/login/login.component.ts`
  - `dashboard/components/recorded-food-collections/recorded-food-collections.component.ts`
  - `dashboard/components/select-shelters/dialogs/select-shelters-dialog.component.ts`
  - `dashboard/components/tickets-processed/tickets-processed.component.ts`
  - `logistics/components/dialogs/select-employee-dialog.component.ts`
  - `logistics/views/food-collection-recording/food-collection-recording.component.ts`
  - `settings/views/shelters/settings-shelters.component.html`
  - `customer/views/customer-detail/dialogs/add-note-dialog.component.ts`
  - `customer/views/customer-detail/dialogs/all-notes-dialog.component.ts`
  - `customer/views/customer-detail/dialogs/lock-customer-dialog.component.ts`
  - `user/components/user-passwordchange/user-passwordchange.component.ts`
- [x] Config/tooling fixes (fixed 2026-07-17): removed the unused `baseUrl` from `src/tsconfig.app.json` and `src/tsconfig.spec.json` (fixes `TS5101`); added `"skipLibCheck": true` to the root `tsconfig.json` (fixes `TS2307`, which came from a broken `.d.ts` inside `@coreui/angular`'s own package).

## Status: COMPLETE — 0 errors, 0 warnings (down from 452) as of 2026-07-17.

## Unique error types (grouped by TS/NG diagnostic code)

### TS2531 — Object is possibly 'null' (157×)
Signals/getters/form controls returning `T | null` are dereferenced without a null check/guard.
- `customer/views/customer-duplicates/customer-duplicates.component.ts:86`
- `customer/views/customer-search/customer-search.component.html:19`
- `customer/views/customer-search/customer-search.component.ts:72,93`
- `dashboard/components/distribution-statistics-input/distribution-statistics-input.component.html:17,22,40,45`
- `dashboard/components/distribution-statistics-input/distribution-statistics-input.component.ts:61,62,64,65,68,69,115`
- `dashboard/components/recorded-food-collections/recorded-food-collections.component.ts:27`
- `logistics/components/dialogs/create-employee-dialog.component.html:11,12,15,17,27,28,31,33,43,44,47,49`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.html:18,29,33,38,49,53,58,63,78,80,82,87,89,92,94,117,119,121,126,128,131,133`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts:87,88,89,90,92,96,99,109,119,120,143,150,157,162,170,171,186,189,190,200,205`
- `logistics/views/food-collection-recording-items-desktop/food-collection-recording-items-desktop.component.ts:108,113,114`
- `logistics/views/food-collection-recording-items-responsive/food-collection-recording-items-responsive.component.ts:84,114`
- `settings/components/mail-recipients/mail-recipients.component.html:27,32,44,60`
- `settings/views/shelters/settings-shelters.component.html:13`

### TS2322 — Type 'X' is not assignable to type 'Y' (71×)
Mostly `null`/`undefined` being assigned into non-nullable model properties (form models, DTOs), plus a few `"true"` string-vs-boolean template-attribute mismatches.
- `common/components/tafel-counter-input/tafel-counter-input.component.html:4,12`
- `common/security/authentication.service.ts:11,23,54,59`
- `common/state/global-state.service.ts:13`
- `checkin/services/qrcode-reader/qrcode-reader.service.ts:86`
- `checkin/views/checkin/checkin.component.ts:240,271,272,273,291,292`
- `customer/components/customer-form/customer-form.component.html:107,308,372,388,406`
- `customer/components/customer-form/customer-form.component.ts:181,184,186,188,192,193,194,198,199,200,201,271,272,273,274,275,276,277,278,279`
- `customer/views/customer-detail/customer-detail.component.html:226`
- `customer/views/customer-detail/customer-detail.component.ts:266,267`
- `customer/views/customer-duplicates/customer-duplicates.component.html:14,23,31,71,74,77,119,122,125`
- `customer/views/customer-edit/customer-edit.component.ts:30`
- `customer/views/customer-search/customer-search.component.html:119,165`
- `dashboard/components/distribution-statistics-input/distribution-statistics-input.component.ts:101`
- `dashboard/dashboard.component.html:10,11,13,20`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts:91,93,201,206`
- `logistics/views/food-collection-recording-items-desktop/food-collection-recording-items-desktop.component.html:18`
- `statistics/statistics.component.html:25,40`
- `user/components/user-form/user-form.component.ts:51,52,112,117,118`

### TS2345 — Argument of type 'X' is not assignable to parameter of type 'Y' (70×)
Same null/undefined-vs-strict-type mismatch, but at call sites (service methods, `FormControl`/schema-path constructors, `.subscribe()` callers).
- `checkin/views/checkin/checkin.component.ts:82,83,88,102,117,126,216,225,264,269,283,297`
- `checkin/views/scanner/scanner.component.ts:37,38,40`
- `customer/components/customer-form/customer-form.component.ts:110,144,145,146,148,149,151,152`
- `customer/views/customer-detail/customer-detail.component.ts:93,96,97,127,130,136,141,146,178,280,305,308,319,321,344`
- `customer/views/customer-detail/dialogs/add-note-dialog.component.ts:14`
- `customer/views/customer-detail/dialogs/all-notes-dialog.component.ts:25`
- `customer/views/customer-detail/dialogs/lock-customer-dialog.component.ts:14`
- `customer/views/customer-duplicates/customer-duplicates.component.html:73,76,121,124`
- `customer/views/customer-duplicates/customer-duplicates.component.ts:70,109`
- `customer/views/customer-search/customer-search.component.html:99,113,118,159,164`
- `customer/views/customer-search/customer-search.component.ts:59,60,61,62,63,64`
- `dashboard/components/distribution-statistics-input/distribution-statistics-input.component.ts:78`
- `dashboard/components/registered-customers/registered-customers.component.ts:38`
- `dashboard/components/select-shelters/dialogs/select-shelters-dialog.component.ts:41`
- `logistics/components/dialogs/select-employee-dialog.component.ts:37`
- `logistics/views/food-collection-recording-items-desktop/food-collection-recording-items-desktop.component.ts:71`
- `logistics/views/food-collection-recording-items-responsive/food-collection-recording-items-responsive.component.ts:163,173`
- `logistics/views/food-collection-recording/food-collection-recording.component.ts:62`
- `settings/components/mail-recipients/mail-recipients.component.ts:86`
- `statistics/statistics.component.ts:106`
- `user/views/user-detail/user-detail.component.ts:67,80`

### TS2532 — Object is possibly 'undefined' (63×)
Same family as TS2531 but for `T | undefined` (typically signals/inputs before initial value, or optional properties).
- `common/pipes/format-customer-address.pipe.ts:20`
- `common/pipes/format-shelter-address.pipe.ts:20`
- `checkin/views/checkin/checkin.component.html:52,115`
- `checkin/views/checkin/checkin.component.ts:135`
- `checkin/views/scanner/scanner.component.html:3`
- `customer/components/customer-form/customer-form.component.ts:227,242`
- `customer/views/customer-detail/customer-detail.component.html:211,213,260,263,266`
- `customer/views/customer-detail/customer-detail.component.ts:156`
- `customer/views/customer-duplicates/customer-duplicates.component.html:46,52,60`
- `customer/views/customer-duplicates/customer-duplicates.component.ts:96`
- `customer/views/customer-edit/customer-edit.component.ts:34,60,88`
- `customer/views/customer-search/customer-search.component.html:76,93,135,139`
- `dashboard/components/select-shelters/dialogs/select-shelters-dialog.component.ts:59`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts:84,193`
- `logistics/views/food-collection-recording-items-desktop/food-collection-recording-items-desktop.component.ts:57,96`
- `logistics/views/food-collection-recording-items-responsive/food-collection-recording-items-responsive.component.html:14,19`
- `logistics/views/food-collection-recording-items-responsive/food-collection-recording-items-responsive.component.ts:56,58,83,113,134,163,173`
- `settings/components/mail-recipients/mail-recipients.component.ts:117,121`
- `statistics/components/statistics-panel.component.html:3,7`
- `statistics/statistics.component.html:102,105,109,119,122,125,135,138,141`
- `user/views/user-detail/user-detail.component.html:11,14`
- `user/views/user-detail/user-detail.component.ts:67,71`

### TS2722 — Cannot invoke an object which is possibly 'undefined' (41×)
Template calls a (likely signal-based) form-field accessor without checking it's defined first — almost all in one file.
- `customer/components/customer-form/customer-form.component.html:310,311,312,324,325,327,335,336,350,351,353,361,362,374,379,380,390,395,396,408,410,411`
- `dashboard/components/registered-customers/registered-customers.component.html:8`

### TS2564 — Property has no initializer and is not definitely assigned in the constructor (11×)
Class fields declared without `!`, a default value, or `strictPropertyInitialization`-safe initialization (often `@ViewChild`/`@Input` fields).
- `checkin/services/qrcode-reader/qrcode-reader.service.ts:13,15`
- `checkin/views/checkin/checkin.component.ts:78,79,80,81,84,85`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts:56,57`
- `user/components/user-passwordchange/user-passwordchange.component.ts:20`

### TS18048 — 'X' is possibly 'undefined' (10×)
Same family, phrased for a specific named variable rather than "Object".
- `customer/components/customer-form/customer-form.component.ts:172`
- `customer/views/customer-edit/customer-edit.component.ts:47,58,86`
- `dashboard/components/tickets-processed/tickets-processed.component.ts:24`
- `dashboard/dashboard.component.html:3`
- `statistics/components/statistics-panel.component.ts:76,80`
- `user/components/user-form/user-form.component.ts:124`

### TS2769 — No overload matches this call (10×)
Usually a knock-on effect of one of the above — fixing the underlying nullability first often resolves these for free.
- `dashboard/components/distribution-statistics-input/distribution-statistics-input.component.ts:47,48`
- `logistics/components/dialogs/create-employee-dialog.component.ts:28,29,30`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts:60,61,68,75,76`

### TS18047 — 'X' is possibly 'null' (5×)
- `customer/views/customer-detail/customer-detail.component.ts:343`
- `dashboard/components/registered-customers/registered-customers.component.ts:37`
- `logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts:127,129`
- `statistics/statistics.component.ts:105`

### NG8109 + TS2774 — function reference used without being invoked (3× each, same 3 locations)
`@if (passwordForm.currentPassword().invalid)` style checks: a signal/getter method is referenced but not called, so the condition is always truthy. Same root cause, single fix per line.
- `common/views/passwordchange-form/passwordchange-form.component.html:36,53,68`

### TS7053 — implicit 'any' from indexing with an unsuitable key type (3×)
- `common/views/login/login.component.ts:49`
- `settings/components/mail-recipients/mail-recipients.component.html:18,27`

### TS7006 — Parameter implicitly has an 'any' type (3×)
- `checkin/views/checkin/checkin.component.ts:281`
- `customer/views/customer-search/customer-search.component.ts:76`
- `logistics/views/food-collection-recording-items-responsive/food-collection-recording-items-responsive.component.ts:138`

### TS5101 — tsconfig `baseUrl` deprecated (1×) — config, not app code
Fix in `frontend/src/main/webapp/tsconfig.json`: either remove `baseUrl` (if unused/no `paths` depend on it) or add `"ignoreDeprecations": "6.0"` as a stop-gap.

### TS2307 — Cannot find module 'node_modules/rxjs/dist/types' (1×) — third-party, not app code
Originates from `node_modules/@coreui/angular/types/coreui-angular.d.ts:10`, not our source. Likely needs a `@coreui/angular` version bump/patch, or can be muted with `skipLibCheck` if not already set — verify before assuming it's actionable on our end.

## Notes
- All paths above are relative to `frontend/src/main/webapp/src/app/`.
- Full raw build log saved at the time of this analysis: `frontend/src/main/webapp` dev server output (path shared in the session that generated this plan — rerun `npm run dev` to regenerate it fresh, since it's not committed here).
- `ng serve` was left running in watch mode after this analysis; check for stray `node` processes if starting a fresh one.

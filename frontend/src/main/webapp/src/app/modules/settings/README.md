# Settings Module

Frontend feature module mounted at `/einstellungen`, gated by the `SETTINGS`
permission (`app.routes.ts` → `anyPermissionOf: ['SETTINGS']`).

This module nominally owns "system settings and mail recipient
configuration" — but it has grown into the catch-all admin area for several
small reference-data screens, **including the food-category admin UI added in
commit `8f2c11e2`, "Add admin UI to maintain food categories" (#2806)**, which
lives here under `views/food-categories`, not under `modules/logistics` despite
food categories conceptually belonging to the logistics/food-collection domain.
If you're looking for where shelters or food categories are *managed* (as
opposed to just *read*, which happens in `logistics`), it's here.

## Structure

```
settings/
  components/
    mail-recipients/    # recipient address matrix, used by views/email
    send-mails/          # re-send mails for a past distribution, used by views/email
  views/
    email/                       # route: einstellungen/email
    shelters/                    # route: einstellungen/notschlafstellen
      dialogs/
        shelter-edit-dialog.component.ts
        shelter-details-dialog.component.ts
    food-categories/              # route: einstellungen/lebensmittelkategorien
      dialogs/
        food-category-create-dialog.component.ts
    static-values/                 # route: einstellungen/statische-werte
      static-value-type-labels.ts
    cars/                          # route: einstellungen/fahrzeuge
      dialogs/
        car-create-dialog.component.ts
    employees/                     # route: einstellungen/mitarbeiter
      dialogs/
        employee-create-dialog.component.ts
    login-attempts/                 # route: einstellungen/anmelde-versuche
      dialogs/
        delete-login-attempt-dialog.component.ts
  settings.routes.ts
```

Note the `views/` folders here nest their own `dialogs/` subfolders directly
(rather than a top-level `components/` shared across all views) — `components/`
is reserved for the two pieces shared by the `email` view specifically.

## `email` (`SettingsEmailComponent`)

A thin composition of two independent, self-contained components — the view
itself has no logic, just `imports: [MailRecipientsComponent, SendMailsComponent]`.

- **`mail-recipients.component.ts`**: builds a nested reactive form —
  `mailRecipients: FormArray` of `{ mailType, recipients: FormArray of { recipientType, addresses: FormArray<string> } }` —
  from the cross product of `MailTypeEnum` (`DAILY_REPORT`, `STATISTICS`,
  `RETURN_BOXES`) and `RecipientTypeEnum` (`TO`, `CC`, `BCC`), both from
  `settings-api.service.ts`. It's populated inside an `effect()` in the
  constructor that fetches `getMailRecipients()` once and manually pushes
  `FormGroup`s into the array — there's no resolver for this one, unlike most
  other list screens in the app. Labels for both enums are hardcoded as
  `Record<..., string>` maps on the component (`MailTypeLabels`,
  `RecipientTypeLabels`) rather than extracted to a separate labels file (contrast
  with `static-value-type-labels.ts` below).
- **`send-mails.component.ts`**: lets an admin pick a past distribution
  (`DistributionApiService.getDistributions()`) and re-trigger its mail
  post-processors via `DistributionApiService.sendMails(id)` — useful when the
  automatic send after closing a distribution failed or needs to go out again.

## `shelters` (`SettingsSheltersComponent`)

CRUD + drag-and-drop reordering for shelters (Notschlafstellen), added most
recently (commit `77d1af19`, "Add sortOrder + drag-and-drop reordering to
Shelters"). Loads via `ShelterApiService.getAllShelters()` into a signal
(`_shelters`), with a Material table (`displayedColumns = ['drag', 'active',
'name', 'address', 'persons', 'actions']`).

- **Reordering** uses Angular CDK drag-and-drop directly on the table rows:
  `CdkDropList` on the table body, `CdkDrag` per `<tr>`, `CdkDragHandle` on a
  dedicated grip-icon column (`faGripVertical`) so the whole row isn't
  draggable from anywhere. The `drop()` handler uses CDK's `moveItemInArray()`
  helper to reorder the in-memory array **optimistically**, then POSTs the new
  id order to `ShelterApiService.reorderShelters()`; on success the signal is
  replaced with the server's authoritative response, on error it's reloaded
  from scratch (`loadShelters()`) to undo the optimistic move. The
  `food-categories` view below implements the identical pattern — if you
  change one, check the other.
- `sortOrder` itself is present on `ShelterItem` but explicitly **not editable**
  in `shelter-edit-dialog.component.ts` (see the comment there) — it's
  server-assigned on create and only changes via drag-and-drop afterwards.
- **Edit dialog** (`shelter-edit-dialog.component.ts`) manages a nested
  `contacts: FormArray` of `{ firstname, lastname, phone }` groups
  (`addContact()`/`removeContact()`), with manual `ChangeDetectorRef.detectChanges()`
  calls after array mutation — a sign this predates/coexists with signal-based
  change detection elsewhere in the app.
- **Details dialog** (`shelter-details-dialog.component.ts`) is a plain read-only
  view, opened via the table's "view" action.
- This `sortOrder` is also now respected outside this module: the dashboard
  shelter listing and the daily-report PDF were updated in a follow-up commit
  (`9b7dd281`, "Respect shelter sortOrder in dashboard and daily report PDF") to
  use the same ordering — so reordering here has visible effects well beyond
  this screen.

## `food-categories` (`SettingsFoodCategoriesComponent`)

CRUD + reordering for food categories, structurally the twin of `shelters`
above (same `CdkDropList`/`CdkDrag`/`CdkDragHandle` + `moveItemInArray` +
optimistic-update-then-reconcile pattern against
`FoodCategoriesApiService.reorderFoodCategories()`).

Differences worth knowing:

- **Inline editing**, not a dialog: clicking edit (`startEdit()`) sets an
  `editingId` signal and swaps that row's cells for a `nameControl`/
  `weightPerUnitControl` pair; `saveEdit()`/`cancelEdit()` exit the mode. A
  `viewChild` + `effect()` auto-focuses the name input whenever it appears —
  the same focus-on-appear trick is reused in `static-values` below. This
  replaced an earlier dialog-based editor (commits `907d9cb8`, `80a53516`,
  `a30b6a36` progressively moved edit inline, dropped the return-item toggle
  from inline editing, and swapped a manual "Sortierung" number input for
  drag-and-drop).
- **Creation still uses a dialog** (`food-category-create-dialog.component.ts`),
  which does expose `returnItem` (Pfandartikel/deposit-return flag) as a
  checkbox — inline editing intentionally does not let you touch `returnItem`
  or `sortOrder` after creation.
- `enabled`/disabled categories: `toggleFoodCategoryVisibility()` flips
  `enabled` via the same update endpoint used for name/weight edits. A disabled
  category is excluded from `FoodCategoriesApiService.getActiveFoodCategories()`,
  which is what feeds the `logistics` module's food-collection-recording form —
  so disabling a category here immediately removes it from that form's category
  list. The edit button is disabled for disabled categories (commit
  `909ca265`) to avoid editing something that's effectively archived.

## `static-values` (`SettingsStaticValuesComponent`)

Read-mostly table of numeric business constants (income limit, additional
adult/child amounts, tolerance, family bonus, child tax allowance, sibling
addition, cost contribution — the full `StaticValueTypeEnum` from
`settings-api.service.ts`). Same inline-edit-with-autofocus pattern as
food-categories (`editingId` signal + `viewChild`/`effect()` focus), but no
create, delete, or reordering — only `amount` is editable per row via
`updateStaticValue()`. Human-readable labels for the enum are centralized in
`static-value-type-labels.ts` (`staticValueTypeLabels: Record<StaticValueTypeEnum, string>`)
rather than inlined on the component, unlike `mail-recipients`' `MailTypeLabels`
map — if you add a new static value type, update that file, not the component.

## `cars` (`SettingsCarsComponent`)

CRUD + drag-and-drop reordering for cars (Fahrzeuge), structurally the twin of
`food-categories` above — inline editing, not a dialog, since a car is just
`licensePlate` + `name` + `enabled` + `sortOrder`.

- Loads via `CarApiService.getAllCars()` into a signal (`_cars`), table
  columns `['drag', 'active', 'licensePlate', 'name', 'actions']`.
- **Inline editing**: clicking edit (`startEdit()`) sets an `editingId` signal
  and swaps that row's `licensePlate`/`name` cells for a `licensePlateControl`/
  `nameControl` pair; `saveEdit()`/`cancelEdit()` exit the mode (Enter saves,
  Escape cancels, same as food-categories). A `viewChild` + `effect()`
  auto-focuses the license-plate input whenever it appears. The edit button is
  disabled for disabled cars, same as food-categories.
- **Creation still uses a dialog** (`car-create-dialog.component.ts`), which
  only exposes `licensePlate`/`name` — `sortOrder`/`enabled` are hidden form
  fields with fixed defaults (`0`/`true`), same convention as
  `food-category-create-dialog.component.ts`.
- Same optimistic-drag-then-reconcile reordering pattern as shelters/food
  categories, against `CarApiService.reorderCars()`.
- Disabling a car here excludes it from `CarApiService.getActiveCars()`,
  which feeds the `logistics` module's food-collection-recording car
  dropdown (`CarDataResolver`) — same relationship as food categories'
  enabled/active split.

## `employees` (`SettingsEmployeesComponent`)

Admin CRUD for employees (Mitarbeiter, #2868), added because `EmployeeEntity`
(`database/model/base/EmployeeEntity.kt`) previously had no maintenance UI at
all — it could only be created inline via `CreateEmployeeDialogComponent` in
`modules/logistics` while recording a food collection. This view is the twin
of `cars` (inline editing, dialog-based creation), but differs in two ways
that reflect the domain:

- **No drag-and-drop reordering** — employees have no `sortOrder` field, so
  unlike shelters/food-categories/cars there's nothing to reorder here.
- **Paginated + searchable**, unlike the reorderable CRUD views above (which
  load their full unpaginated list in one call; `login-attempts` below is
  paginated too). `EmployeeController`/`EmployeeService` (in
  `modules/base/employee`, pre-existing, shared with the `logistics` module's
  create-employee flow) implement `GET /api/employees?searchInput=&page=&pageSize=`
  server-side (`PaginationDefaults`: 10 by default, selectable via
  `PAGE_SIZE_OPTIONS`), driving a `mat-paginator` off a `PagedResponse` — same
  wiring as `customer`'s `customer-search.component.ts` (`length`/`pageSize`/
  `pageIndex` bound to the response, 1-based backend page vs 0-based
  `mat-paginator` index). Like `customer-search`/`customer-above-limit`/
  `customer-duplicates`, the paginator is rendered twice — once above the
  table, once below — so long lists don't force a scroll back up just to
  change page; both instances are bound to the same signal and stay in sync.
- Employees also have no `enabled` flag and no delete endpoint — same
  "no hard delete" convention as the rest of the app, but here there isn't
  even a soft-disable toggle, so the edit button is never disabled.
- `EmployeeController` was widened from `@PreAuthorize("hasAuthority('LOGISTICS')")`
  to `hasAuthority('LOGISTICS') or hasAuthority('SETTINGS')` at the class level
  so this view's `SETTINGS`-only users can reach it too, without changing
  access for the existing `LOGISTICS` call site.
- **Creation** uses a dialog (`employee-create-dialog.component.ts`), structurally
  the twin of `car-create-dialog.component.ts` — plain `personnelNumber`/
  `firstname`/`lastname` fields, all required with a 50-char limit matching the
  `employees` table's `varchar(50)` columns. This is a *different* component
  from `logistics`' `CreateEmployeeDialogComponent`, which is purpose-built
  for the "employee not found while recording a food collection" flow (fixed
  dialog title, calls the API itself and closes with the saved entity) rather
  than a generic create dialog — reusing it here would have been misleading.

## `login-attempts` (`SettingsLoginAttemptsComponent`)

Read + delete view over the `login_attempts` table (`LoginAttemptEntity`,
`common/auth/components/LoginAttemptService.kt`) that backs failed-login
lockout tracking (`TafelLoginProvider`) — added so an admin can see who's
currently tracked/locked and clear an entry to lift a lockout immediately
instead of waiting out `lockoutDurationInSeconds` (#2870).

- Loads via `SettingsApiService.getLoginAttempts()`, paginated like `employees`
  above (`mat-paginator` bound to a `PagedResponse<LoginAttemptItem>` signal,
  `PAGE_SIZE_OPTIONS`, 1-based backend page vs 0-based `mat-paginator` index,
  rendered both above and below the table like `employees`); the backend
  sorts by most recent failure first, with `id` as a stable tiebreaker
  (`LoginAttemptRepository.findAllByOrderByLastFailureAtDescIdDesc`). Table
  columns: `['username', 'failureCount', 'lastFailureAt', 'lockedUntil',
  'actions']`. The `testid` (`login-attempts-paginator`) lives only on the
  bottom instance — same reason `employees-paginator` does — so e2e specs
  that click into it don't have to disambiguate two matches.
- **No create, no edit** — this view only ever displays what
  `LoginAttemptService` already tracks from real login attempts.
- **Status column**: `isLocked()` compares `lockedUntil` against `Date.now()`
  client-side (the backend doesn't send a precomputed boolean) so a lock that
  has since expired shows as inactive without needing a reload.
- **Delete** goes through a confirm dialog
  (`delete-login-attempt-dialog.component.ts`, twin of
  `customer/views/customer-detail/dialogs/delete-customer-dialog.component.ts`)
  since deleting is the only destructive action in this view — unlike the
  inline-edit views above there's no "undo via cancel". Deleting clears the
  row entirely (same effect as a successful login via
  `LoginAttemptService.recordSuccess()`), which is what actually lifts a lock,
  not just a `lockedUntil = null` update.

## API services

As elsewhere, HTTP access lives in `app/api/`, not under this module:

- `settings-api.service.ts` — mail recipients, static values, and their
  `MailTypeEnum`/`RecipientTypeEnum`/`StaticValueTypeEnum` definitions; also
  `getLoginAttempts()`/`deleteLoginAttempt()` for the `login-attempts` view.
- `shelter-api.service.ts` — `ShelterApiService`, including `reorderShelters()`.
- `car-api.service.ts` — `CarApiService`, including `reorderCars()`; also used
  by `logistics`' `CarDataResolver` for the read-only `getActiveCars()` side.
- `food-categories-api.service.ts` — `FoodCategoriesApiService`, shared with
  `logistics` (which only calls its read side; full CRUD + reorder is only
  exercised from this module).
- `distribution-api.service.ts` — used by `send-mails` to list distributions and
  trigger re-sends.
- `employee-api.service.ts` — `EmployeeApiService`; `findEmployees()` (paged,
  optional `searchInput`) and `saveEmployee()` predate this view (shared with
  `logistics`' create-employee flow), `updateEmployee()` was added for this
  view's inline editing.

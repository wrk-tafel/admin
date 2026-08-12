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
      static-value-types.ts
      dialogs/
        static-value-change-dialog.component.ts
    cars/                          # route: einstellungen/fahrzeuge
      dialogs/
        car-create-dialog.component.ts
    employees/                     # route: einstellungen/mitarbeiter
      dialogs/
        employee-create-dialog.component.ts
    food-return-categories/        # route: einstellungen/retourkategorien
      dialogs/
        food-return-category-create-dialog.component.ts
    shops/                         # route: einstellungen/filialen
      dialogs/
        shop-edit-dialog.component.ts
    routes/                        # route: einstellungen/routen
      dialogs/
        route-edit-dialog.component.ts
    enabled-filter.ts              # Alle/Aktiv/Inaktiv filter shared by shops + routes
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
  with `static-value-types.ts` below).
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

Read-mostly view of the numeric business constants (income limit, additional
adult/child amounts, tolerance, family allowance, child tax allowance, sibling
addition, cost contribution — the full `StaticValueTypeEnum` from
`settings-api.service.ts`). Same inline-edit-with-autofocus pattern as
food-categories (`editingId` signal + `viewChild`/`effect()` focus), but no
create, delete, or reordering — only `amount` is editable per row via
`updateStaticValue()`.

These numbers decide who receives food, which is what the screen is shaped
around:

- **One section per type, under two group headings** ("Einkommensgrenze" and
  "Unkostenbeitrag"), each with a sentence saying what the value does and where
  it is applied — a `groups()` computed turns the flat API list into that
  structure. A type with no row at all is left out rather than rendered empty.
- **A row is qualified only by the columns its type is looked up by**
  (`qualifierFields`): the seeded tolerance row carries `countAdults`/
  `countChildren` of `0` that no lookup reads, so "every column that is not
  null" would show numbers that decide nothing. The qualifier column disappears
  entirely for a type whose rows don't differ in one.
- **A changed amount is confirmed as old → new** (`dialogs/static-value-change-dialog.component.ts`)
  before it is sent, stating that it takes effect immediately; an amount left as
  it was ends the edit without a request, so the audit trail records no
  no-op change.
- **Cross-links** to `/kunden/ueber-limit` (the direct consumer of these
  numbers) and to `/aenderungsprotokoll?art=StaticValue` (who changed one last),
  both behind `*tafelIfPermission`.

Labels, descriptions, group membership and qualifier fields per enum value are
centralized in `static-value-types.ts` (`staticValueTypeSpecs: Record<StaticValueTypeEnum, StaticValueTypeSpec>`)
rather than inlined on the component, unlike `mail-recipients`' `MailTypeLabels`
map — if you add a new static value type, update that file, not the component;
the screen renders nothing it has no entry for.

Test hooks are numbered by the row's position in the list **as the API returns
it** (`static-values-row-3`, `staticValueAmountInput-3`), not within its
section, so grouping doesn't renumber them. The per-section table/card wrappers
carry the type (`static-values-table-INCOME_LIMIT`).

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
  load their full unpaginated list in one call; the `user` module's
  `login-attempts` view is paginated too). `EmployeeController`/`EmployeeService` (in
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

## `shops` (`SettingsShopsComponent`) and `routes` (`SettingsRoutesComponent`)

The two logistics master-data screens. Unlike every other view in this module they are **not**
Material tables with a mobile card fallback: both render a list of expandable cards, because their
records carry more detail than a row can hold (a shop's contact block, a route's whole list of
stops). The collapsed header row is the overview — number badge, name, one line of summary
(`view.address` / `view.stopsSummary`) and an "Inaktiv" badge — the expanded body holds the
details, so there is no separate read-only details dialog for either of them.

Both follow the same shape, and a change to one usually belongs in the other:

- **View models, not raw entities in the template.** A `computed()` maps each `ShopItem`/`RouteData`
  to a `ShopView`/`RouteView` that pre-renders everything the template shows (address string, unit
  label, resolved shop name per stop, `HH:mm` times, stops summary) plus a lowercased
  `searchIndex`. The template only interpolates — no method calls, no pipes per row.
- **Search + status filter.** A `FormControl` fed through `toSignal()` and an `enabledFilter`
  signal (`EnabledFilter` from `views/enabled-filter.ts`) drive a `visibleShops()`/`visibleRoutes()`
  `computed()`. Filtering is purely client-side; both endpoints return the full list anyway.
- **Enabling/disabling** happens with a `mat-slide-toggle`. On a failed update the list is
  reloaded, because the toggle has already moved on its own and only fresh data puts it back.
- **Editing** stays dialog-based (`shop-edit-dialog`, `route-edit-dialog`), and the edit button is
  disabled while the record is inactive, same convention as cars/food-categories.
- **Both controls sit in the record's header row**, not in the expanded body, so a record can be
  switched or edited without expanding it first. This is why neither screen uses `mat-accordion`:
  `mat-expansion-panel-header` is itself a `role="button"`, and a control nested inside a button is
  not reliably reachable — assistive technology exposes the header as one button and need not
  convey the children's roles (axe reports it as `nested-interactive`, one node per record). Each
  record is therefore a plain card whose summary is its own `<button>` carrying
  `aria-expanded`/`aria-controls`, with the toggle and the edit button as its **siblings** and the
  body a `role="region"` that `[hidden]` collapses. A new control in that row goes beside them, not
  inside the summary button. Expanded state is held as a `Set` of record ids (not indices), so a
  search or filter change cannot transfer it to whichever record moves into that position.
- `route-edit-dialog` manages the stops as a nested `stops: FormArray` of
  `{ time, shopId, description }` with `addStop()`/`removeStop()` plus manual
  `ChangeDetectorRef.detectChanges()` calls, structurally the twin of `shelter-edit-dialog`'s
  contacts array. Stop order is never edited by hand — the backend sorts stops by their time
  (`RouteService.mapRoute`), so there is no drag-and-drop here.
- `SettingsRoutesComponent` loads shops alongside routes (`forkJoin`) to resolve each stop's shop
  name and address. New routes may only pick active shops, while editing a route additionally
  offers the disabled shops it already stops at, so saving can't silently drop such a stop.

## API services

As elsewhere, HTTP access lives in `app/api/`, not under this module:

- `settings-api.service.ts` — mail recipients, static values, and their
  `MailTypeEnum`/`RecipientTypeEnum`/`StaticValueTypeEnum` definitions.
- `shelter-api.service.ts` — `ShelterApiService`, including `reorderShelters()`.
- `car-api.service.ts` — `CarApiService`, including `reorderCars()`; also used
  by `logistics`' `CarDataResolver` for the read-only `getActiveCars()` side.
- `food-categories-api.service.ts` — `FoodCategoriesApiService`, shared with
  `logistics` (which only calls its read side; full CRUD + reorder is only
  exercised from this module).
- `distribution-api.service.ts` — used by `send-mails` to list distributions and
  trigger re-sends.
- `shop-api.service.ts` — `ShopApiService`, shared with `routes` (which needs the shop list to
  resolve its stops) and with `logistics`' food-collection recording.
- `route-api.service.ts` — `RouteApiService`; the settings view uses `getAllRoutes()` plus
  create/update, `logistics` only the `getActiveRoutes()` read side.
- `employee-api.service.ts` — `EmployeeApiService`; `findEmployees()` (paged,
  optional `searchInput`) and `saveEmployee()` predate this view (shared with
  `logistics`' create-employee flow), `updateEmployee()` was added for this
  view's inline editing.

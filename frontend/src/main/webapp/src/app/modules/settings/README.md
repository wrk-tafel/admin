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
  settings.routes.ts
```

Note the `views/` folders here nest their own `dialogs/` subfolders directly
(rather than a top-level `components/` shared across all views) — `components/`
is reserved for the two pieces shared by the `email` view specifically.

## Active/inactive is the same on every screen here

No record in this module is ever deleted — `shelters`, `food-categories`,
`food-return-categories`, `cars`, `shops` and `routes` all deactivate instead,
because recorded distributions and food collections point at what they hold.
Every one of those six screens therefore shows and switches that state the same
way, and a screen that gains an `enabled` flag follows suit:

- **The switch is the status.** One `tafel-enabled-toggle`
  (`common/components/tafel-enabled-toggle/`) per record, labelled "Aktiv",
  sitting in the record's action row — in a table, in the `active` column, with
  `[showLabel]="false"` since the column header is the label already. Its
  position is what says whether the record is active, so nothing carries a
  second "Inaktiv" marker beside it; the row or card additionally takes
  `tafel-inactive`, which mutes its text. Test hook:
  `<screen>-enabled-toggle-<i>`, `-mobile-<i>` in the card fallback.
- **A status filter above the list**: one `tafel-enabled-filter`
  (`common/components/tafel-enabled-filter/`, `EnabledFilter` +
  `matchesEnabledFilter` beside it), Alle/Aktiv/Inaktiv, feeding a
  `visibleXxx()` `computed()` that both layouts and the drop lists render.
  Without it the working list would grow forever. Test hooks:
  `<screen>-status-filter`, `<screen>-filter-all|-enabled|-disabled`.
- **`{{ enabledCount() }} von {{ totalCount() }} aktiv` beside the heading**
  (testid `<screen>-summary`), counted over the full list, not the filtered one.
- **Reordering counts displayed positions, not stored ones** on the four
  sortable screens: `reorder()` translates both indices through the visible list
  into the full one before `moveItemInArray`, so a filtered-out record keeps its
  place and a move past it jumps over it. The whole list of ids is still sent —
  the backend numbers what it is given from 1. The handle testids are keyed by
  the *displayed* index, which is what `ReorderFeedbackService.refocusHandle`
  must be given.
- **The edit button is disabled while a record is inactive**, on every screen —
  an archived record is not maintained, it is reactivated first.
- **What deactivating costs is said once, in the screen's intro paragraph**
  (where the category/car/shelter no longer appears, and what it stays part of),
  not per row.

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

CRUD + drag-and-drop reordering for shelters (Notschlafstellen). Loads via
`ShelterApiService.getAllShelters()` into a signal (`_shelters`).

- **An expandable card list**, like `shops`/`routes` below and unlike the other
  reorderable screens: a shelter carries a whole contact list, which no table row
  can hold. The collapsed header row is the overview (reorder handle, name,
  address, persons count), the expanded body holds the full
  address, the persons count and the contacts, each contact's phone number a
  `tel:` link. There is no read-only details dialog. The header row's own
  nested-interactive constraint is the one described under `shops`/`routes`:
  the summary is a plain `<button>` carrying `aria-expanded`/`aria-controls`,
  and reorder handle, Aktiv switch and edit button are its **siblings**,
  so all three work without expanding the record first. Expanded state is held
  as a `Set` of shelter ids, not indices, so a reorder cannot carry it over to
  whichever record moves into that position.
- **Reordering** uses Angular CDK drag-and-drop on the cards: `CdkDropList` on
  the list, `CdkDrag` per card, `CdkDragHandle` on the `tafel-reorder-handle`
  so the whole card isn't draggable from anywhere. Both the `drop()` (pointer)
  and the `moveShelter()` (keyboard) path go through the same `reorder()`, which
  uses CDK's `moveItemInArray()` to reorder the in-memory array
  **optimistically**, then POSTs the new id order to
  `ShelterApiService.reorderShelters()`; on success the signal is replaced with
  the server's authoritative response, on failure a toast says so and the list is
  reloaded from scratch (`loadShelters()`) to undo the optimistic move. The
  `food-categories` and `cars` views implement the identical pattern — if you
  change one, check the others.
- `sortOrder` itself is present on `ShelterItem` but explicitly **not editable**
  in `shelter-edit-dialog.component.ts` (see the comment there) — it's
  server-assigned on create and only changes via drag-and-drop afterwards.
- **Edit dialog** (`shelter-edit-dialog.component.ts`) manages a nested
  `contacts: FormArray` of `{ firstname, lastname, phone }` groups
  (`addContact()`/`removeContact()`), with manual `ChangeDetectorRef.detectChanges()`
  calls after array mutation — a sign this predates/coexists with signal-based
  change detection elsewhere in the app. Only the phone number is required, so a
  contact can be a bare number and the list renders it without a name.
- This `sortOrder` is respected outside this module too: the dashboard shelter
  listing and the daily-report PDF use the same ordering — so reordering here has
  visible effects well beyond this screen, which is what the caption line above
  the list tells the administrator.

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
  the same focus-on-appear trick is reused in `static-values` below. Enter saves
  and Escape cancels, which a `mat-hint` under the name field and the
  "(Enter)"/"(Esc)" suffixes on the save/cancel tooltips are what make
  discoverable, same as `food-return-categories`.
- **Creation uses a dialog** (`food-category-create-dialog.component.ts`), which
  asks for the name and the weight and nothing else: `sortOrder` is
  server-assigned (a new category goes last) and changes only by dragging
  afterwards.
- **The weight carries its unit wherever it is shown** — `| number: '1.0-3'`
  plus a `kg` suffix in the cell, a `kg` `matTextSuffix` on both the inline and
  the dialog input — and a category without a weight says so in its place
  instead of leaving the cell blank: the backend reads a null `weightPerUnit`
  as 0 kg (`FoodCollectionItemEntity.calculateWeight`), so such a category
  contributes nothing to any warehouse statistic.
- **The screen says what it drives**: the paragraph above the list carries the
  two facts about the list as a whole — the order here is the category order in
  the Warenerfassung, and deactivating removes a category from that form at once
  — while what the weight does is a `tafel-info-tooltip` at the weight column
  itself (`weightExplanation` on the component, one tooltip per layout). It
  belongs there rather than in a third sentence of the intro: on a phone every
  extra line of intro pushes the list below the fold, which the e2e spec's
  card-list case catches.
- `enabled`/disabled categories: `toggleFoodCategoryVisibility()` flips
  `enabled` via the same update endpoint used for name/weight edits. A disabled
  category is excluded from `FoodCategoriesApiService.getActiveFoodCategories()`,
  which is what feeds the `logistics` module's food-collection-recording form —
  so disabling a category here immediately removes it from that form's category
  list. Switch, filter and summary are the module-wide ones described at the top.

## `food-return-categories` (`SettingsFoodReturnCategoriesComponent`)

The crate types offered as counters in the Warenerfassung's Retourware section — the twin of
`food-categories`, minus the weight (return crates are counted, never weighed) and minus the
`returnItem` flag, and with the same inline-edit + dialog-create + optimistic-reorder pattern
against `FoodReturnCategoriesApiService.reorderFoodReturnCategories()`.

Where it goes beyond that twin:

- **The screen says what it drives**: the category order is the counter order in the
  Warenerfassung, and the names appear in the route guidance's "Retourware mitnehmen/abgeben"
  hints. Both this screen and `food-categories` also carry a note distinguishing them from each
  other, since they look alike and are one nav entry apart — the two notes link to one another and
  belong together.

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
  Each group names one `headingType` whose section renders *without* a heading
  of its own, since the group heading already is it; its `label` still names
  that row's actions and its confirmation, where the group heading is out of
  view. A group whose only type is that one carries no description either — the
  type's own says it.
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
  auto-focuses the license-plate input whenever it appears.
- **License plates are normalized** to trimmed upper case by
  `normalizeLicensePlate()` (`views/cars/license-plate.ts`) while the admin
  types, and again by `CarService` server-side — the food-collection dropdown
  lists plates verbatim, so `w-12345x` beside `W-12345X` reads as two vehicles.
- **Creation uses a dialog** (`car-create-dialog.component.ts`), which
  only exposes `licensePlate`/`name` — `sortOrder`/`enabled` are hidden form
  fields with fixed defaults (`0`/`true`), same convention as
  `food-category-create-dialog.component.ts`. It receives every car via
  `MAT_DIALOG_DATA` to recognize a plate that already exists: for an active one
  it blocks the save, for a deactivated one it offers re-activating that car
  instead, and closes with `{reactivate: car}` rather than `{create: car}`.
- Same optimistic-drag-then-reconcile reordering pattern as shelters/food
  categories, against `CarApiService.reorderCars()`, over the displayed cars as
  described at the top of this file.
- Disabling a car here excludes it from `CarApiService.getActiveCars()`,
  which feeds the `logistics` module's food-collection-recording car
  dropdown (`CarDataResolver`) — same relationship as food categories'
  enabled/active split. The car itself stays in this list, greyed and with its
  Aktiv switch off: recorded food collections point at it, so it is kept.

## `employees` (`SettingsEmployeesComponent`)

Admin CRUD for employees (Mitarbeiter, #2868), added because `EmployeeEntity`
(`database/model/base/EmployeeEntity.kt`) previously had no maintenance UI at
all — it could only be created inline via `CreateEmployeeDialogComponent` in
`modules/logistics` while recording a food collection. This view is the twin
of `cars` (inline editing, dialog-based creation), but differs in two ways
that reflect the domain:

- **No drag-and-drop reordering** — employees have no `sortOrder` field, so
  unlike shelters/food-categories/cars there's nothing to reorder here.
- **Paginated + searched as the search box is typed** (400 ms debounce), unlike
  the reorderable CRUD views above (which load their full unpaginated list in
  one call; the `user` module's `login-attempts` view is paginated too). There
  is no "Suchen" button: the search is server-side either way, and a name
  lookup is refined by typing rather than by pressing a button after every
  correction — same reasoning, and the same `sr-only role="status"`
  result-count announcement, as the `audit` module's change log.
  `EmployeeController`/`EmployeeService` (in
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
  even a soft-disable toggle, so the edit button is never disabled. The card's
  caption says so, because the alternative is an admin hunting for a delete
  button that was never left out by accident.
- **The linked user account is a column of its own.** `EmployeeItem.userAccount`
  carries the account referencing the employee, rendered as a chip that links
  to `/benutzer/detail/:id` for a viewer holding `USER_MANAGEMENT` and reads
  "Benutzerkonto vorhanden" for everyone else. The personnel number is the join
  key between this screen and the user administration, and it used to be
  invisible from both sides.
- **A personnel-number collision is shown while the number is typed**, in the
  create dialog and in an inline edit alike (`GET
  /api/employees/personnel-number-availability`, 400 ms debounce, the edited
  employee passed as `excludedEmployeeId` so its own number is not a collision
  with itself). It sets a `duplicateEmployee` error on the control — hence a
  validator reading the signal rather than `setErrors`, which would drop the
  `required`/`maxlength` errors — and offers the employee already holding the
  number: `openEmployee()` narrows the list to it and opens it for editing,
  which is what the create dialog's `openExisting` result asks the view to do.
  The backend still rejects a taken number with a 409; this only means an admin
  finds out before typing the rest of the record.
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
  The two ask for the same three fields under the same rules and produce the
  same record, which is what the dialog's opening line tells the admin, so the
  driver created on the fly during a collection doesn't look like a lesser one.

## `shops` (`SettingsShopsComponent`) and `routes` (`SettingsRoutesComponent`)

The two logistics master-data screens. Like `shelters` above and unlike the remaining views in this
module they are **not** Material tables with a mobile card fallback: both render a list of
expandable cards, because their records carry more detail than a row can hold (a shop's contact
block, a route's whole list of stops). The collapsed header row is the overview — number badge,
name and one line of summary
(`view.address` / `view.stopsSummary`) — the expanded body holds the
details, so there is no separate read-only details dialog for either of them.

Both follow the same shape, and a change to one usually belongs in the other:

- **View models, not raw entities in the template.** A `computed()` maps each `ShopItem`/`RouteData`
  to a `ShopView`/`RouteView` that pre-renders everything the template shows (address string, unit
  label, resolved shop name per stop, `HH:mm` times, stops summary) plus a lowercased
  `searchIndex`. The template only interpolates — no method calls, no pipes per row. `ShopView` also
  carries `mapUrl` (`buildSingleDestinationMapsUrl` from `common/util/maps-url.util.ts`, the same
  helper `route-guidance` uses for a single stop's own "Navigation starten" link) and `routeUsage` —
  every route stopping there, active and inactive alike, built once per shops/routes load
  (`routeUsageByShopId`) rather than re-scanned per row. The expanded body renders `routeUsage` as
  links to `/einstellungen/routen` (this screen already requires `SETTINGS`, the same permission
  that gates the routes list, so the link needs no separate permission check of its own) and falls
  back to "Wird derzeit von keiner Route angefahren" when the list is empty.
- **Search on top of the status filter.** A `FormControl` fed through `toSignal()` and the
  `enabledFilter` signal together drive a `visibleShops()`/`visibleRoutes()` `computed()`.
  Filtering is purely client-side; both endpoints return the full list anyway. These two screens
  are the only ones here with a search box — their lists are the long ones. `shops` additionally
  offers a Nummer/Name sort toggle (`sortBy` signal, applied inside the same `computed()`), a
  result-count line (`resultCountLabel`) shown only while `filtered()` is true, and an empty-result
  message that names the active status filter (`emptyMessage`) rather than a single generic
  sentence.
- **Enabling/disabling** happens with the module-wide Aktiv switch. On a failed update the list is
  reloaded, because the switch has already moved on its own and only fresh data puts it back.
  `shops` additionally loads `routes` (`forkJoin`, same as `SettingsRoutesComponent` below) to know
  which routes stop at a shop: deactivating one that at least one *active* route still stops at
  opens `shop-disable-confirm-dialog` first, naming those routes and their stop times — the route
  itself keeps the stop (`route-edit-dialog` never drops a reference), but the Routen-Navi then
  flags it "Filiale inaktiv", which is what the confirmation is warning about before it happens. A
  cancelled confirmation has nothing to undo on the server, but the Aktiv switch still has to be
  pushed back to `checked` explicitly (`this._shops.update(shops => [...shops])`) — it is an
  uncontrolled Material component that already flipped itself in the DOM on click.
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
- **A record's surface is `.tafel-panel`** (`scss/components/tafel-panel.scss`), shared with
  `shelters` and the place to change the look of all three at once: flat, white, with the same
  `--tafel-border-color` outline and 12px radius an outlined `mat-card` has. The list sits inside a
  white card, so the only thing separating one record from the surface behind it is that border —
  which is why the panel carries no elevation shadow: a shadow fades outwards and blurs exactly the
  edge that has to be legible.
- `route-edit-dialog` manages the stops as a nested `stops: FormArray` of
  `{ time, shopId, description }` with `addStop()`/`removeStop()` plus manual
  `ChangeDetectorRef.detectChanges()` calls, structurally the twin of `shelter-edit-dialog`'s
  contacts array. Stop order is never edited by hand — the backend sorts stops by their time
  (`RouteService.mapRoute`), so there is no drag-and-drop here.
- `SettingsRoutesComponent` loads shops alongside routes (`forkJoin`) to resolve each stop's shop
  name and address. New routes may only pick active shops, while editing a route additionally
  offers the disabled shops it already stops at, so saving can't silently drop such a stop.
- **`routes` shows a result count** once the search/filter narrows the list (`routes-result-count`,
  plus a `role="status"` `searchAnnouncement()` for screen readers) — the same "search polish"
  #3240 asked for shops too, kept as an independent implementation on each screen rather than a
  shared component, since `shops` doesn't have it yet. The count line is rendered `invisible`
  rather than removed while the list is unfiltered, so the record cards never shift when it
  appears. There is deliberately no sort control: the list is always ordered by route number, and
  the one search box already matches number, name, note and stops alike.
- **A search term that hits a route only through its stops auto-expands that route** (an `effect`
  over `stopsSearchIndex`): the matching shop is invisible while the card is collapsed, so the
  card opens to show what matched. It never auto-collapses — the summary toggle stays the way
  back, also after the search is cleared.
- **`routes`' expanded card also carries a "Route in Karte öffnen" link** (`view.mapsUrl`, built by
  the module-local `buildRouteMapsUrl()`), composing the same kind of Google Maps directions URL as
  the Routen-Navi's own map link (`route-guidance.component.ts`) over the route's already
  time-sorted stops — capped at 10 stops with a truncation hint beyond that, same limit and reason
  as there. A stop whose shop has since been deactivated is flagged inline with the same "Filiale
  inaktiv" badge the Routen-Navi shows its drivers (`view.stops[].shopInactive`).
- **`route-edit-dialog` previews the save-time sort live** as `orderedStopsPreview()` ("Gefahrene
  Reihenfolge"), and separately surfaces non-blocking `stopWarnings()` (a duplicate shop across
  stops, a stop with no time yet, or an unusually short/long gap to the next time-sorted stop that
  is likely a typo) — both `computed()` off the `stops` FormArray's own `valueChanges` via
  `toSignal()`, so they update on every keystroke without a manual `detectChanges()` call. Neither
  blocks `save()`; the backend still rejects an actual duplicate shop/time on its own.

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

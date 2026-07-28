# Settings Module

Frontend feature module mounted at `/einstellungen`, gated by the `SETTINGS`
permission (`app.routes.ts` → `anyPermissionOf: ['SETTINGS']`).

Per `AGENTS.md` this module owns "system settings and mail recipient
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

## API services

As elsewhere, HTTP access lives in `app/api/`, not under this module:

- `settings-api.service.ts` — mail recipients, static values, and their
  `MailTypeEnum`/`RecipientTypeEnum`/`StaticValueTypeEnum` definitions.
- `shelter-api.service.ts` — `ShelterApiService`, including `reorderShelters()`.
- `food-categories-api.service.ts` — `FoodCategoriesApiService`, shared with
  `logistics` (which only calls its read side; full CRUD + reorder is only
  exercised from this module).
- `distribution-api.service.ts` — used by `send-mails` to list distributions and
  trigger re-sends.

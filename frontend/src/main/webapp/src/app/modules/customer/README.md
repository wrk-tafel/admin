# Customer Module

Search, create, edit, view, and review customers: master data, income validation,
duplicate review, PDF generation (ID card / master data), notes, locking, and
ticket assignment during an active distribution. Routed under `/kunden/*`.

**Read the section below before touching anything in this module.** It documents a
naming/data-shape decision that is easy to violate by accident and hard to notice in
review.

## The household/customer naming trap

The backend's `household` module renamed its domain model: a **household** is the case
record (business number, address, contact info, validity/lock/cost-contribution state)
containing one or more **persons**, exactly one of which is flagged `isMainPerson`. See
`AGENTS.md` ("Backend Architecture" / `households`+`persons` tables) for the full
picture.

This frontend module was **deliberately not renamed** to match. Routes
(`/kunden/...`), the folder name (`modules/customer/`), every component/view/resolver
class name, and the two DTOs (`CustomerData`, `CustomerAddPersonData`) all still use
the old flat "customer + additional persons" shape:

- The main person's fields (`firstname`, `lastname`, `birthDate`, `gender`, `country`,
  `employer`, `income`, `incomeDue`) live directly on `CustomerData`, alongside
  household-level fields (`address`, `telephoneNumber`, `email`, `validUntil`,
  `locked`/`lockedAt`/`lockedBy`/`lockReason`, `pendingCostContribution`, `issuer`,
  `issuedAt`).
- Every other household member is a `CustomerAddPersonData` in
  `CustomerData.additionalPersons[]`.

**`app/api/customer-api.service.ts` is the only file in the whole frontend that is
allowed to know the backend's household/person wire shape.** It defines its own
`HouseholdData`/`PersonData`/etc. interfaces and — critically — **does not export
them**. Nothing outside that file can even `import` them; the translation is enforced
by the type system, not just convention. Every component, view, resolver and dialog in
`modules/customer/` (and everywhere else) only ever sees `CustomerData` /
`CustomerAddPersonData`.

The translation happens in two functions at the bottom of `customer-api.service.ts`:

```ts
// Backend -> frontend
function mapHouseholdToCustomer(household: HouseholdData | null | undefined): CustomerData {
  const persons = household?.persons ?? [];
  const mainPerson = persons.find(person => person.isMainPerson);
  const additionalPersons = persons
    .filter(person => !person.isMainPerson)
    .map(person => ({ /* person fields, minus isMainPerson */ }) as CustomerAddPersonData);

  return {
    // household-level fields copied as-is (id, issuer, issuedAt, address,
    // telephoneNumber, email, validUntil, locked*, pendingCostContribution)
    // main person's fields flattened onto the customer (firstname, lastname,
    // birthDate, gender, country, employer, income, incomeDue)
    additionalPersons,
  };
}

// Frontend -> backend
function mapCustomerToHousehold(customer: CustomerData): HouseholdData {
  const mainPerson: PersonData = {
    isMainPerson: true,
    // ...customer's flat fields moved back onto a person...
    excludeFromHousehold: false,
    receivesFamilyBonus: false,
  };
  const additionalPersons: PersonData[] = (customer.additionalPersons ?? [])
    .map(person => ({ ...person, isMainPerson: false }));

  return { /* household-level fields */ persons: [mainPerson, ...additionalPersons] };
}
```

Gotchas worth knowing before you change either direction:

- `excludeFromHousehold` and `receivesFamilyBonus` only exist on
  `CustomerAddPersonData`/`PersonData`. The main person is always sent with both
  hardcoded to `false` — the flat `CustomerData` has no field to carry them for the
  main person.
- The main person's own `persons[].id` is **not** round-tripped: the flat
  `CustomerData` shape has nowhere to keep it. The backend re-resolves the existing
  main person from the household's stored id instead, so an update still lands on the
  same row rather than creating a new person.
- `CustomerAddPersonData.key` is a form-only field (a stable identifier for Angular's
  `@for` tracking while editing additional persons). It is never present on the wire in
  either direction — `customer-form.component.ts` invents one with
  `crypto.randomUUID()` when it doesn't already have one.

**When adding a new field:** decide first whether it belongs to the household
(case-level) or to a specific person, then update it in up to four places —
`CustomerData`/`CustomerAddPersonData`, the matching (non-exported) `HouseholdData`/
`PersonData` field, and both `mapHouseholdToCustomer`/`mapCustomerToHousehold`. **Do
not** add a shortcut that reaches past `customer-api.service.ts` to talk to
`/api/households` directly, and do not export `HouseholdData`/`PersonData`/etc. from
that file — that export is the thing standing between "quirky but contained" and "the
whole module has to learn the household/person model."

## Folder structure

```
modules/customer/
  ├── components/
  │   ├── confirm-customer-save-dialog/   # generic "force save anyway?" confirm dialog
  │   └── customer-form/                  # the big reactive form, shared by create + edit views
  ├── views/
  │   ├── customer-above-limit/           # list of customers whose income exceeds the limit
  │   ├── customer-detail/                # detail page + its dialogs/ (notes, lock, delete)
  │   ├── customer-duplicates/            # list of already-flagged duplicate customer pairs
  │   ├── customer-edit/                  # create (no id) / edit (:id) — hosts customer-form + its dialogs/
  │   └── customer-search/                # search by id or lastname/firstname + filters
  ├── resolver/
  │   ├── customerdata-resolver.component.ts
  │   ├── customernotes-resolver.component.ts
  │   ├── customer-duplicates-data-resolver.component.ts
  │   └── customer-above-limit-data-resolver.component.ts
  └── customer.routes.ts
```

There is no `services/` subfolder here (unlike the generic module convention in
`AGENTS.md`) — this module has no feature-specific service beyond the shared
`CustomerApiService`/`CustomerNoteApiService` in `app/api/`, which every module can
use.

Resolvers follow the `-resolver.component.ts` suffix convention and use `@Service()`
(this codebase's DI decorator, seen on every injectable across the app — not specific
to this module) rather than a class with an `@Injectable()`-style suffix.

### Routing (`customer.routes.ts`)

| Path | Component | Resolvers |
|---|---|---|
| `anlegen` | `CustomerEditComponent` (create mode, no input) | — |
| `detail/:id` | `CustomerDetailComponent` | `CustomerDataResolver`, `CustomerNotesResolver` |
| `bearbeiten/:id` | `CustomerEditComponent` (edit mode) | `CustomerDataResolver` |
| `suchen` | `CustomerSearchComponent` | — |
| `duplikate` | `CustomerDuplicatesComponent` | `CustomerDuplicatesDataResolver` |
| `ueber-limit` | `CustomerAboveLimitComponent` | `CustomerAboveLimitDataResolver` |

`CustomerEditComponent` doubles as both the create and edit view: `editMode` is a
`computed()` off whether the `customerData` input is set, not a separate component.

## Duplicate handling — two distinct flows

There are two separate duplicate-related UI paths in this module; don't conflate them:

1. **Save-time duplicate warning (the "review candidates before creating" flow from
   `AGENTS.md`'s Special Considerations).** When `CustomerApiService.createCustomer`/
   `updateCustomer` gets a `409` from the backend (a likely-duplicate match on
   lastname/firstname/birthdate), `CustomerEditComponent.save()` opens
   `ConfirmCustomerSaveDialog` with the backend's message ("Trotzdem speichern?"). If
   the user confirms, the same call is retried with `force: true`, which the API
   service passes through as a query param on `POST /households`/`POST
   /households/{id}`.
2. **Standalone duplicate review list**, `views/customer-duplicates/` +
   `CustomerDuplicatesDataResolver`. Backed by `GET /households/duplicates` (via
   `CustomerApiService.getCustomerDuplicates()`), it lists pairs of *already saved*
   customers the backend considers duplicates so staff can review them later: open a
   candidate's detail, delete one outright (`deleteCustomer`), or merge one or more
   candidates into a surviving customer (`mergeCustomers(targetId, sourceIds)` → `POST
   /households/{id}/merge`, deleting the merged-away records).

Both ultimately go through `customer-api.service.ts`'s translation layer — the
duplicates response has the same `HouseholdDuplicatesResponse` → `{customer,
similarCustomers}` mapping as everything else.

## Income validation feedback

Two independent layers, both scoped to the flat `CustomerData`/form model:

- **Client-side, per-field:** `components/customer-form/customer-form.component.ts`
  builds a `form()` (Angular signal forms) with a schema that calls `validate(schemaPath.income,
  min(0, {message: 'Einkommen muss mindestens 0 sein'}))` for the main person and for
  each entry of `additionalPersons` (via `applyEach`). Errors surface using the shared
  helpers in `common/util/signal-form-helper.ts`:
  `visibleErrorMessages(fieldState)`/`fieldStateClasses(fieldState)`, both gated on
  `touched()` (not `dirty()`) so messages don't flash while typing — the signal-forms
  equivalent of `updateOn: 'blur'`.
- **Server-side, against the configured income limit:** the "Prüfen" action on
  `CustomerEditComponent.validate()` calls `CustomerApiService.validate(data)` → `POST
  /households/validate`, which runs the backend's `IncomeValidatorService` and returns
  `{valid, totalSum, limit, toleranceValue, amountExceededLimit}`. The result is shown
  in `views/customer-edit/dialogs/validation-result-dialog.component.ts` — green
  "Anspruch vorhanden" or red "Kein Anspruch vorhanden" — including the limit
  (incl. tolerance), total income, and amount over the limit.
- There's also a standalone review list for customers already over the limit,
  `views/customer-above-limit/` + `CustomerAboveLimitDataResolver`, backed by `GET
  /households/above-limit` — the same list-for-manual-review pattern as the duplicates
  view above.

## Angular idioms used here

- Standalone components everywhere, no `NgModule`.
- Views that receive resolver data use an aliased `input()`/`input.required()` (alias
  matches the resolver key in `customer.routes.ts`) paired with a `linkedSignal()` of
  the same name (without the `Input` suffix) so the page can locally mutate what
  started as router data (pagination, post-save updates, etc.) without losing the
  "reset when the route re-resolves" behavior:

  ```ts
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly customerDuplicatesDataInput = input<CustomerDuplicatesResponse>(undefined, {alias: 'customerDuplicatesData'});
  readonly customerDuplicatesData = linkedSignal(() => this.customerDuplicatesDataInput());
  ```
- `customer-form.component.ts` uses Angular's signal-based reactive forms
  (`@angular/forms/signals`: `form()`, `FormField`, `required()`, `validate()`,
  `applyEach()`) rather than `FormGroup`/`FormBuilder` — `customer-search.component.ts`
  is the exception, still on classic `ReactiveFormsModule`/`FormBuilder` since it's a
  simple filter bar, not a validated data-entry form.
- `effect()` in the form component's constructor both pushes external `customerData`
  input changes into the form model and pushes form changes back out via
  `customerDataChange` (`output()`) — there's no two-way binding, just two one-way
  effects.
- `CustomerEditComponent` reads `customerFormComponent().valid()` (a `viewChild.required()`
  plus `computed()`) to gate the Save button, and calls `markAllAsTouched()` before
  attempting to save so validation messages show up even if the user never blurred a
  field.

## What not to do

- Don't import or recreate `HouseholdData`/`PersonData` shapes outside
  `customer-api.service.ts`. If you find yourself needing a household/person-only field
  in a component, that's a sign it needs to be added to `CustomerData`/
  `CustomerAddPersonData` and threaded through the two mapping functions instead.
- Don't call `/api/households*` endpoints directly from a component — always go through
  `CustomerApiService`.
- Don't rename this module's routes, folders, classes or DTOs to "household"/"person"
  in a partial PR. The mismatch with the backend is intentional and repo-wide (see
  `AGENTS.md`); a half-renamed module would be worse than a consistently old-named one.

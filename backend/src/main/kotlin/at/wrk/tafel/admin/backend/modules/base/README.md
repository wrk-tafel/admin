# Base Module

`base` is a grab-bag of small, shared concerns: countries, employees, and generic exception
handling. Unlike every other feature module, **there is no `modules/base/package-info.java`** — the
`base` package itself is not a Spring Modulith `@ApplicationModule`. Instead, each subpackage
(`country`, `employee`, `exception`) has its own `package-info.java` annotated with
`@org.springframework.modulith.NamedInterface("...")`, making each one an independently
addressable, explicitly exported slice that other modules can declare a dependency on individually
(e.g. `allowedDependencies = {"base::exception", "base::employee"}` in `logistics`'s
`package-info.java`). Do not add a blanket `base` module dependency anywhere — always depend on the
specific named interface (`base::country`, `base::employee`, or `base::exception`) you actually need.

Entities backing this module are **not** colocated with it: they live under `database/model/base`
(`EmployeeEntity`, `EmployeeRepository`) and `database/model/staticdata` (`CountryEntity`,
`CountryRepository`), consistent with the repo-wide convention that entities/repositories live in
`database/model/`, not `modules/`.

## Components

### `country` — `@NamedInterface("country")`
- [`CountryController`](country/CountryController.kt): `GET /api/countries`, requires only
  `isAuthenticated()` (no specific permission) — returns the full country list, unpaginated.
- [`CountryModel.kt`](country/CountryModel.kt): exposes `Country(id, code, name)` and
  `CountryListResponse`.
- Backed by `CountryRepository`/`CountryEntity` in `database/model/staticdata` (table
  `static_countries`).
- **Only consumer:** the `household` module. `HouseholdConverter` resolves a `Person`'s
  `CountryEntity` by id (`countryRepository.findById(person.country.id)`), and
  `HouseholdConverter.mapCountryToResponse` maps it back to the `base.country.Country` DTO for the
  `Person.country` field in `HouseholdResponseModel.kt`. `household`'s `package-info.java` lists
  `base::country` in `allowedDependencies` accordingly. No other module references
  `modules.base.country`.

### `employee` — `@NamedInterface("employee")`
- [`EmployeeController`](employee/EmployeeController.kt): `GET /api/employees` (paginated search by
  name/personnel number) and `POST /api/employees` (create), both gated behind `LOGISTICS`
  authority (not a typo — employee management is treated as a logistics concern, since employees are
  mainly used to track who staffed a distribution/collection).
- [`EmployeeModel.kt`](employee/EmployeeModel.kt): `Employee(id, personnelNumber, firstname,
  lastname)`, `EmployeeListResponse`, `EmployeeCreateRequest`.
- Backed by `EmployeeRepository`/`EmployeeEntity` in `database/model/base` (table `employees`).
- **Only consumer:** the `logistics` module (`FoodCollectionService`, `FoodCollectionsModel`), which
  declares `base::employee` in its `allowedDependencies`. Note that `household` does **not** depend
  on `base::employee` even though `HouseholdEntity.issuer` and `HouseholdNoteEntity.employee` are
  both `EmployeeEntity` references — `household` reaches `EmployeeEntity` directly through
  `UserEntity.employee` (a `database.model` type, not a `modules.base.employee` type), so it never
  needs this named interface.

### `exception` — `@NamedInterface("exception")`
- [`TafelExceptions.kt`](exception/TafelExceptions.kt): two exception types,
  `TafelException` and `TafelValidationException` (both `RuntimeException` with an optional
  `HttpStatus`; when `status` is null the handler below defaults to 400 Bad Request). They are
  functionally near-identical today — the distinction is intent/logging severity, not behavior.
- [`GenericExceptionHandler`](exception/GenericExceptionHandler.kt): a `@ControllerAdvice` with
  three handlers:
  - `TafelException` → logged at `warn`.
  - `TafelValidationException` → logged at `debug` (expected/user-facing validation failures
    shouldn't spam the warn log).
  - anything else (`Exception`) → logged at `error`, always answered as 500.
  All three build a localized `TafelErrorResponse` (`http-error.<status>.title` message key looked
  up via `MessageSource`) and special-case SSE requests: if the incoming request's `Accept` header
  contains `text/event-stream`, the error is written as an `event: error` SSE frame instead of a
  normal JSON error body, so error responses don't break an open EventSource connection.
- **Widely used:** `household`, `logistics`, `distribution`, and `settings` all declare
  `base::exception` in their `allowedDependencies` and throw `TafelValidationException` for
  business-rule violations (e.g. "Kunde Nr. X bereits vorhanden!" in `HouseholdController`). This is
  the module to reach for whenever a service needs to reject a request with a clear HTTP status and
  a user-facing message.

## Adding to this module

Because there's no top-level `base` `@ApplicationModule`, adding a new shared subpackage means:
1. Create the subpackage under `modules/base/<name>/`.
2. Add a `package-info.java` with `@org.springframework.modulith.NamedInterface("<name>")`.
3. Put entities/repositories under `database/model/<...>`, not under `modules/base/<name>/`.
4. Any module that wants to use it must add `"base::<name>"` to its own `allowedDependencies` in its
   `package-info.java` — Spring Modulith's build-time verification will fail the build otherwise.

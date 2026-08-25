# Base Module

`base` holds the small, shared concerns that *other backend modules* consume: countries, employees,
and generic exception handling. That consumer test is what defines the module's scope — a small
concern with no backend consumer is not a `base` slice but its own top-level module (see
[`modules/config`](../config/README.md), whose only consumer is the frontend over HTTP).

Unlike every other feature module, **there is no `modules/base/package-info.java`** — the `base`
package itself is not a Spring Modulith `@ApplicationModule`. Instead, each subpackage (`country`,
`employee`, `exception`) has its own `package-info.java` annotated with
`@org.springframework.modulith.NamedInterface("...")`, making each one an independently addressable,
explicitly exported slice that other modules can declare a dependency on individually (e.g.
`allowedDependencies = {"base::exception", "base::employee"}` in `logistics`'s `package-info.java`).
Do not add a blanket `base` module dependency anywhere — always depend on the specific named
interface (`base::country`, `base::employee`, or `base::exception`) you actually need.

Entities backing this module are **not** colocated with it: they live under `database/model/base`
(`EmployeeEntity`, `EmployeeRepository`) and `database/model/staticdata` (`CountryEntity`,
`CountryRepository`), consistent with the repo-wide convention that entities/repositories live in
`database/model/`, not `modules/`. A named interface therefore gates this module's service/DTO
surface only — never the entities behind it, which sit outside `modules/` and are ambiently
available to everyone (see [Employees are reachable two ways](#employees-are-reachable-two-ways)).

## Components

### `country` — `@NamedInterface("country")`
- [`CountryController`](country/CountryController.kt): `GET /api/countries`, requires only
  `isAuthenticated()` (no specific permission) — returns the full country list, unpaginated.
- [`CountryModel.kt`](country/CountryModel.kt): exposes `CountryItem(id, code, name)` and
  `CountryListResponse`. `CountryItem` never appears as a standalone single-resource response or a
  request body - it's only ever an element of `CountryListResponse.items` or an embedded field on
  `Person`, hence the `Item` suffix rather than a `Request`/`Response` split.
- Backed by `CountryRepository`/`CountryEntity` in `database/model/staticdata` (table
  `static_countries`).
- **Only consumer:** the `household` module. `HouseholdConverter` resolves a `Person`'s
  `CountryEntity` by id (`countryRepository.findById(person.country.id)`), and
  `HouseholdConverter.mapCountryToResponse` maps it back to the `base.country.CountryItem` DTO for
  the `Person.country` field in `HouseholdResponseModel.kt`. `household`'s `package-info.java` lists
  `base::country` in `allowedDependencies` accordingly. No other module references
  `modules.base.country`.

### `employee` — `@NamedInterface("employee")`
- [`EmployeeController`](employee/EmployeeController.kt): `GET /api/employees` (paginated search by
  name/personnel number), `GET /api/employees/personnel-number-availability` (is a number still
  free, and who holds it if not), `POST /api/employees` (create), and `PUT
  /api/employees/{employeeId}` (update). Class-level `@PreAuthorize("hasAuthority('LOGISTICS') or
  hasAuthority('SETTINGS')")` — originally `LOGISTICS`-only (employee management was treated purely
  as a logistics concern, since employees are mainly used to track who staffed a
  distribution/collection), widened to also accept `SETTINGS` for the employee admin/maintenance
  screen under the frontend's `settings` module (`SettingsEmployeesComponent`, #2868) without
  narrowing the original `logistics` call site's access.
- [`EmployeeModel.kt`](employee/EmployeeModel.kt): `EmployeeItem(id, personnelNumber, firstname,
  lastname, userAccount)` as the element of `EmployeeListResponse`, `EmployeeResponse(id,
  personnelNumber, firstname, lastname)` for the create/update responses,
  `PersonnelNumberAvailabilityResponse`, and `EmployeeRequest` (used for both create and update).
  The list element is its own type because only it carries `userAccount`: the account referencing
  an employee is what the admin screen shows next to the row, and there is no reason for a food
  collection's driver to drag one along.
- The availability check is advisory - `saveEmployee`/`updateEmployee` reject a taken personnel
  number with a `ConflictException` regardless, since a number can be given out between the check
  and the save. It exists so the collision can be shown next to the field being typed into,
  together with the employee already holding the number.
- Backed by `EmployeeRepository`/`EmployeeEntity` in `database/model/base` (table `employees`) plus
  `UserRepository.findAccountsByEmployeeIds` for the linked accounts — one query per page, not one
  per row. Reaching `database/model/auth` straight from here is the ambient-lower-layer pattern
  described below, not a `base`→`auth` module dependency (there is no `auth` module).
- `internal/EmployeeRetentionService`: GDPR gap G13
  (`docs/architecture/gdpr-compliance.md`) — a nightly job that deletes an employee once it has no
  linked user account and its row hasn't been written to in longer than
  `tafeladmin.employeeDeletion.retentionYears` (7 years by default), through the same
  `EmployeeService.deleteEmployee` a staff member's manual delete uses. Mirrors
  `common/auth/components/UserRetentionService` for `users`, which has its own, shorter window.
- **Backend consumer:** the `logistics` module (`FoodCollectionService`, `FoodCollectionsModel`),
  which declares `base::employee` in its `allowedDependencies` — this is a Spring Modulith
  named-interface dependency between backend modules, not the same thing as "who calls the REST
  endpoint"; the frontend's `settings` module now also calls `/api/employees` directly over HTTP for
  its maintenance screen, which doesn't require any backend `allowedDependencies` change since it
  doesn't import Kotlin types from this package.

#### Employees are reachable two ways

`logistics` goes through this named interface (`EmployeeService`/`EmployeeResponse`). `household`
does **not** depend on `base::employee` at all, even though `HouseholdEntity.issuer` and
`HouseholdNoteEntity.employee` are both `EmployeeEntity` references: it reaches the entity directly
through `UserEntity.employee`, a `database.model` type rather than a `modules.base.employee` one.

That is an accepted pattern, not an oversight or a boundary to be tightened. `database/model/` sits
outside `modules/` and is deliberately an ambiently shared lower layer that every module may inject
from without declaring anything — so a named interface gates the service/DTO surface, and never the
JPA entity graph underneath it. Routing `household` through `base::employee` would not actually
close anything either: it needs a managed `EmployeeEntity` to *assign* as `issuer`, whereas this
module's service exists precisely to hand out DTOs instead of entities.

The one hard rule is direction — `database/model/` must never depend back on `modules/`, which is
enforced by `database entities should not depend on feature modules` in
`architecture/ProjectSpecificRulesTest`. Within that, expect a shared entity to be reached by both
an enforced and an unenforced path, and read a module's `allowedDependencies` as "what Kotlin types
it imports from other modules", not "everything it touches".

### `exception` — `@NamedInterface("exception")`
- [`TafelExceptions.kt`](exception/TafelExceptions.kt): RFC 7807 (`ProblemDetail`) based exceptions,
  each extending `org.springframework.web.ErrorResponseException` and fixing its own `HttpStatusCode`
  in its constructor, so - unlike the old `TafelException`/`TafelValidationException` pair - the
  status can't be forgotten at a throw site:
  - `NotFoundException` → 404, the addressed resource (usually looked up by an id from the request
    path) doesn't exist.
  - `ConflictException` → 409, the request conflicts with the current state of a resource
    (duplicate/already exists, an in-progress operation on the same resource, ...).
  - `BusinessRuleException` → 400 by default (an explicit status can be passed), for business-rule
    violations not covered by the two above, e.g. an invalid reference inside a request body.
- [`GenericExceptionHandler`](exception/GenericExceptionHandler.kt): a `@ControllerAdvice` extending
  Spring's `ResponseEntityExceptionHandler`, which natively turns any `ErrorResponseException` (our
  three types above) and Spring's own `ErrorResponse`-producing exceptions (e.g.
  `MethodArgumentNotValidException`) into a `ProblemDetail` response.
  - `handleExceptionInternal` is the shared hook all of those funnel through: it localizes the
    `ProblemDetail`'s `title` and `detail` (`http-error.<status>.title`/`.detail` message keys in
    `i18n/messages.properties`, looked up via `MessageSource`, falling back to `http-error.default.*`
    for a status with no entry of its own) and logs at `debug` (expected/user-facing failures
    shouldn't spam the log).
  - **Only a `detail` this application authored itself survives** — the message a `TafelApiException`
    was thrown with, and `handleMethodArgumentNotValid`'s own wording. Everything else reaching that
    hook is one of Spring's built-in MVC exceptions, whose `detail` is English framework-internals
    text ("Failed to read request"), so it is replaced with the generic German sentence for the
    status. That matters because the frontend puts `detail` straight into an error toast
    (`extractErrorMessage()` in `common/api/problem-detail.ts`). Same reason `handleGenericException`
    never puts the raw exception message in the body — it only logs it.
    - Related trap, see issue #3008: `MessageConfig` must **not** enable
      `useCodeAsDefaultMessage`. Spring probes a family of optional `problemDetail.<exception class>`
      codes it expects to be missing, and that flag turns every miss into a hit, so the raw message
      code is what ends up in `detail` (and as the problem `type` URI).
  - `handleMethodArgumentNotValid` additionally attaches a structured `errors: [{field, message}]`
    extension property to the `ProblemDetail`, instead of joining field errors into one string.
  - Anything else (`Exception`) is caught by a dedicated `@ExceptionHandler`, logged at `error`, and
    always answered as 500.
  - All of these render through the same SSE special-case: if the incoming request's `Accept` header
    contains `text/event-stream`, the error is written as an `event: error` SSE frame instead of a
    normal JSON error body, so error responses don't break an open EventSource connection.
- **Widely used:** `household`, `logistics`, `distribution`, and `settings` all declare
  `base::exception` in their `allowedDependencies` and throw these exceptions for business-rule
  violations (e.g. `ConflictException("Kunde Nr. X bereits vorhanden!")` in `HouseholdController`).
  This is the module to reach for whenever a service needs to reject a request with a clear HTTP
  status and a user-facing message.

## Adding to this module

First check that it belongs here at all: `base` is for concerns another backend module imports
Kotlin types from. If nothing but the frontend consumes it, give it its own top-level
`modules/<name>/` with an `@ApplicationModule(allowedDependencies = {})` instead, the way
[`version`](../version/README.md) is set up.

Because there's no top-level `base` `@ApplicationModule`, adding a new shared subpackage means:
1. Create the subpackage under `modules/base/<name>/`.
2. Add a `package-info.java` with `@org.springframework.modulith.NamedInterface("<name>")`.
3. Put entities/repositories under `database/model/<...>`, not under `modules/base/<name>/`.
4. Any module that wants to use it must add `"base::<name>"` to its own `allowedDependencies` in its
   `package-info.java` — Spring Modulith's build-time verification will fail the build otherwise.

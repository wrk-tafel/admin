# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a food bank (Tafel) administration system built with a Spring Boot/Kotlin backend and Angular frontend. The system manages customer registrations, food distributions, logistics operations, and generates various reports and statistics. It supports German locale (de-DE) with Euro currency.

## Build and Development Commands

**The Gradle wrapper (`gradlew`/`gradlew.bat`) lives at the repo root, not in `backend/`.** Always
invoke it as `./gradlew :backend:...` from the repo root (or with an explicit path to the root
wrapper) — there is no wrapper inside `backend/`, so running it from that directory fails with
"not recognized"/"No such file or directory".

### Full Application Build
Backend and frontend build independently - there's no Gradle cross-dependency between them.
```bash
# Backend
./gradlew :backend:build

# Frontend (from frontend/src/main/webapp)
npm run build-prod
```

### Backend Development
```bash
# Run backend with local profile (from root)
./gradlew :backend:bootRun --args='--spring.profiles.active=local'

# Run all tests
./gradlew :backend:test

# Run specific test class
./gradlew :backend:test --tests "at.wrk.tafel.admin.backend.modules.household.internal.HouseholdServiceTest"

# Run specific test class (wildcard, useful since test method names use backtick display names)
./gradlew :backend:test --tests "*HouseholdServiceTest"

# Run integration tests with timeout
timeout 90 ./gradlew :backend:test --tests "*AdvisoryLockServiceIT"

# Run with testdata
./gradlew :backend:bootRun --args='--spring.profiles.active=local,testdata'

# Run with e2e profile
./gradlew :backend:bootRun --args='--spring.profiles.active=e2e'

# Compile only (useful for quick validation)
./gradlew :backend:compileKotlin

# Lint / format check (ktlint)
./gradlew :backend:ktlintCheck
./gradlew :backend:ktlintFormat
```

### Frontend Development

**Prerequisites:**
- Node.js and npm (see `frontend/src/main/webapp/package.json`'s `engines` field for the exact
  minimum versions — kept there, not here, since they change often)

```bash
# Navigate to frontend webapp directory
cd frontend/src/main/webapp

# Install dependencies
npm install

# Start development server (proxies to backend at localhost:8080)
npm run dev

# Build for local testing
npm run build-local

# Build for production
npm run build-prod

# Run unit tests
npm test

# Run unit tests in CI mode (headless)
npm run test-ci

# Run unit tests for specific file
npm test -- --include="src/app/common/sse/sse.service.spec.ts"

# Lint code
npm run lint

# Type-check without emitting (app + spec + cypress configs)
npm run typecheck

# Run E2E tests (requires backend running on port 8080)
npm run cy:run-ci

# Open Cypress UI for E2E tests
npm run cy:open-local
```

### Dependency Verification

Gradle dependency verification is configured via `gradle/verification-metadata.xml`. When updating dependencies, always regenerate this file with `--refresh-dependencies` to avoid missing checksums:

```bash
./gradlew --write-verification-metadata sha256 --refresh-dependencies
```

Without `--refresh-dependencies`, Gradle uses locally cached artifacts and skips re-downloading them, so new checksums (e.g., `.module` files) may not be recorded. This causes CI failures where artifacts are downloaded fresh and cannot be verified.

## Architecture

### Backend Architecture

The backend uses **Spring Modulith** architecture with 10 core feature modules (plus `base` for shared utilities), each with explicit boundaries enforced via `package-info.java` annotations:

- **household**: Household/person management (business package still called `household`, DB tables `households`/`persons`) with income validation, duplicate detection, PDF generation (ID cards, master data). A household is the case record (business number, address, contact, validity/lock/cost-contribution state); it has one or more persons, exactly one of which is flagged as the main person. Note: the frontend module is still named `customer` and its DTOs still use the old flat "customer + additionalPersons" shape on purpose (see Frontend Architecture and API Structure below) — only `customer-api.service.ts` knows about the household/person split.
- **distribution**: Food distribution events with ticket management and statistics; publishes `DistributionClosedEvent` on close for other modules (e.g. `reporting`) to react to
- **logistics**: Routes, food collections, shelters, shops, cars, and food category management
- **checkin**: Scanner registration and customer check-in via QR codes
- **dashboard**: Overview page with real-time updates, registered customers, and distribution state
- **reporting**: Statistics exports (CSV), daily reports (PDF), age/country/household distributions
- **settings**: Application configuration and mail recipient management
- **support**: In-app support contact form that files a GitHub issue on the user's behalf
- **push**: Web Push (VAPID) device subscriptions and per-user notification preferences; broadcasts
  on distribution started/closed events
- **config**: `GET /api/config` — the deployment-wide facts the frontend needs before it can render
  itself: the running release version, the image build time, and the flags for optional features
  this environment has switched on (currently `scannerFolderEnabled`). Read only by the frontend.
  Operator-managed configuration only — anything a *user* can change at runtime belongs in
  `settings`. `GET /api/config/public` serves the environment label on its own to anonymous callers,
  for the login page, and `GET /api/sse/config` pushes the config again whenever an operator's edit
  changes it (see Config Hot-Reload below)
- **base**: Shared utilities (countries, employees, exception handling). Its entities live in
  `database/model/base/`, but each utility is also its own `@NamedInterface` submodule under
  `modules/base/{country,employee,exception}/` for other modules to depend on. `base` is only for
  concerns another *backend* module consumes through a named interface — something with no backend
  consumer belongs in its own top-level module (that's why `config` is one)

**Layering Pattern:**
- Controllers: REST endpoints with `@PreAuthorize` method-level security
- Services: Business logic with `@Transactional` boundaries
- Repositories: Spring Data JPA with custom specifications for complex queries
- Entities: Located in `database/model/` with Flyway migrations in `resources/db-migration/`

**Module boundaries vs. the entity layer:** Spring Modulith's `allowedDependencies` check governs
`modules.*`-to-`modules.*` traffic only. `database/model/*` sits outside `modules/` and is
deliberately an ambiently shared lower layer: **any** module may inject **any** entity/repository
from it without declaring a dependency, and named interfaces gate only the service/DTO surface, not
the JPA entity graph. So two modules legitimately reach the same entity by two different paths —
e.g. `logistics` gets employees through `base::employee`'s `EmployeeService`/`EmployeeResponse`,
while `household` stamps `HouseholdEntity.issuer` straight from `UserEntity.employee` — and that is
an accepted pattern, not a bypass to be tidied up. The one hard rule is direction: `database/model/*`
must never depend on `modules/*`, enforced by an ArchUnit rule in `architecture/ProjectSpecificRulesTest`.
Don't read a module's `allowedDependencies` as the full list of what it touches at the DB level.

**Spring Modulith is a build-time concern here.** Only `spring-modulith-api` — the
`@ApplicationModule`/`@NamedInterface` annotations — is on the production classpath; the Modulith
runtime and the ArchUnit classpath scan it performs at startup are `testImplementation` only, via
`spring-modulith-starter-test`. `ModularityTest` is what verifies the module structure. So nothing
reads the module metadata while the application runs: the Modulith actuator endpoint isn't exposed,
and `@ApplicationModuleListener` is not available — plain `@EventListener` is what cross-module
events use (see the `distribution`/`reporting` module READMEs for why that's also the preferred
choice on its own merits).

**Key Technologies:**
- Java with Kotlin (coroutines support) — see `backend/build.gradle.kts`'s toolchain block and
  `gradle/libs.versions.toml` for exact versions
- Spring Boot with Spring Modulith for modular monolith architecture
- PostgreSQL with Flyway for database migrations (60+ R__ repeatable scripts)
- JWT authentication with Argon2 password hashing
- Server-Sent Events (SSE) via outbox pattern for real-time notifications
- Apache FOP for PDF generation from XSL templates
- Spring Security with role-based access control
- Testcontainers for integration testing

**Notable Patterns:**
- Outbox pattern for reliable SSE event publishing (`sse_outbox` table)
- Event listener pattern for distribution close: `DistributionEndedEventListener` runs stats/cost-contribution work synchronously in-module, then publishes `DistributionClosedEvent` for `reporting` to pick up async (see distribution/reporting module READMEs for the "why" history)
- Converter pattern for entity-to-DTO mapping
- Custom validators for income limits and customer validation
- Base entities with change tracking (created/updated timestamps, employee references)

### Frontend Architecture

The frontend is an Angular single-page application using Angular Material and Tailwind CSS as the UI framework.

**Feature Modules:**
- **dashboard**: Overview with distribution state, registered customers, food amounts, statistics input
- **customer**: Search, create, edit, detail views with duplicate detection. Deliberately *not* renamed to match the backend's `household`/`person` model — routes, components, and `CustomerData`/`CustomerAddPersonData` DTOs are unchanged; only `customer-api.service.ts` translates to/from the backend's household+persons wire shape (main person flattened onto the customer object, other persons as `additionalPersons`)
- **checkin**: Scanner registration, QR code reading, ticket screen for customer calls
- **logistics**: Food collection recording only (desktop/responsive layouts), one screen (`warenerfassung`). Shelter/car/food-category as well as route/shop admin CRUD screens actually live under the **settings** module below, not here — this module only ever reads routes and shops, from within the food-collection-recording flow.
- **user**: User search, create, edit with password change functionality, plus the login attempts (`anmelde-versuche`) admin screen — read + delete over failed-login lockout tracking
- **settings**: System settings and mail recipient configuration, plus admin CRUD screens for shelters (`notschlafstellen`), food categories (`lebensmittelkategorien`), and cars (`fahrzeuge`) — all three with drag-and-drop sortOrder reordering (Angular CDK) — as well as employees (`mitarbeiter`), static values/limits (`statische-werte`), shops (`filialen`) and routes (`routen`). Shops and routes are the two screens that are deliberately *not* Material tables with a mobile card fallback: they render a `mat-accordion` with a search field and an Alle/Aktiv/Inaktiv filter, so the record's details (a shop's contacts, a route's stops) live in the expanded panel instead of a separate details dialog — see the settings module README before restyling them back into a table
- **statistics**: Chart.js-powered distribution/demographic statistics panels

**Architecture Patterns:**
- Standalone components with lazy-loaded feature modules
- Resolver pattern for data pre-fetching before route activation
- Route guards for authentication and permission-based access control
- Global state service using RxJS BehaviorSubjects
- SSE service for real-time updates from backend
- Custom directives (`tafelIfPermission`, `tafelAutofocus`, `tafelIfDistributionActive`)

**Module Structure Convention:**
```
modules/<feature>/
  ├── components/       # Reusable components
  ├── views/           # Page-level components
  ├── services/        # Feature-specific services
  ├── resolver/        # Route data resolvers
  └── <feature>.routes.ts
```

**Key Technologies:**
- Angular with standalone components
- Angular Material (UI component library)
- Angular CDK (component dev kit)
- Tailwind CSS (utility-first CSS framework) — see `frontend/src/main/webapp/package.json` for
  exact Angular/Material/CDK/Tailwind versions
- RxJS for reactive programming
- @zxing/browser / @zxing/library for scanner QR decoding
- ngx-cookie-service for session management
- Chart.js for statistics visualization
- FontAwesome Angular (icon library)
- Cypress for E2E testing

**Authentication:**
- Basic HTTP authentication with session cookies
- Permission-based access control (see `UserPermissions.kt` for the current permission list,
  grouped into OPERATIONS/TRANSPORT/LEADERSHIP/ADMINISTRATION categories — this list grows with
  every new admin feature, so it's not duplicated here)
- Functional route guards checking permissions
- HTTP interceptors for API path handling and error management

## Database

The application uses PostgreSQL with Flyway for schema management. Migration files are located in `backend/src/main/resources/db-migration/` with the naming pattern `R__XXXXX_<description>.sql` (repeatable migrations).

**Key Tables:**
- `users`, `user_authorities`: User authentication and permissions
- `employees`: Employee records referenced in change tracking
- `households`: the case record (business number, address, contact, validity/lock/cost-contribution state); `main_person_id` points at its main person. Nullable at the DB level (not `NOT NULL`) because `households`/`persons` mutually reference each other — a brand-new household is always saved in two steps (household with `main_person_id = null` → its persons → set `main_person_id`), see `HouseholdService`
- `persons`: every household member, including the main person, flagged via `is_main_person` (exactly one per household, enforced by a partial unique index)
- `household_notes`: notes attached to a household
- `distributions`: Food distribution events
- `distributions_households`: household participation in distributions
- `distributions_statistics`: Statistics per distribution
- `customers`, `customers_addpersons`: legacy tables, superseded by `households`/`persons` above. Kept read-only/unused for a production observation window before a separate cleanup migration drops them — do not write to these, do not build new features against them
- `routes`, `route_stops`, `shops`: Logistics route management
- `food_categories`, `food_collections`, `food_collection_items`: Food recording
- `shelters`, `shelter_contacts`: Shelter management
- `cars`: Vehicle management
- `sse_outbox`: Outbox pattern for SSE events
- `mail_addresses`: Email recipient configuration

## Testing

### Backend Tests
- Unit tests: Named `*Test.kt` in `src/test/kotlin/`
- Integration tests: Named `*IT.kt` (use Testcontainers for PostgreSQL)
- Run all tests: `./gradlew :backend:test` (from root)
- Run specific test: `./gradlew :backend:test --tests "*HouseholdServiceTest"`
- Base test class: `TafelBaseIntegrationTest` sets up test environment
- Integration tests automatically start PostgreSQL via Testcontainers

### Frontend Tests
- Unit tests: Vitest (`.spec.ts` files in `src/app/`)
- Run unit tests: `npm test` (from frontend/src/main/webapp)
- Run headless: `npm run test-ci`
- Run specific test: `npm test -- --include="src/app/common/sse/sse.service.spec.ts"`
- E2E tests: Cypress (in `frontend/src/main/webapp/cypress/e2e/`)
- Run E2E: `npm run cy:run-ci` (requires backend running on port 8080)
- Open Cypress UI: `npm run cy:open-local` (for local development)
- **Any new or changed frontend user-facing behavior (a new dialog, form field, button, tab, flow)
  must come with an added/updated Cypress e2e case** covering it end-to-end, not just a Vitest unit
  spec — this is easy to forget since unit tests alone can pass while the real flow is broken (e.g.
  a required DB sequence missing only shows up when a real request round-trips through a real
  backend, which only e2e/integration tests exercise). Before calling frontend work done, check
  whether `cypress/e2e/*.cy.ts` needs a new `it(...)` for what changed.

## User Guide

There is a German-language user guide for end users at `docs/userguide/` (`README.md` plus one file
per module, with screenshots in `docs/userguide/images/`). **Any new feature or user-facing feature
change must be reflected in this user guide** — update the relevant module file (and add/replace
screenshots if the UI changed) as part of the same task, not as a follow-up. This is easy to forget
since it lives outside the code you're editing. On every update or regeneration, also observe:

- **No mouse cursor in screenshots.** The cursor position persists across page navigations within
  the same browser tab/session — it's not enough to just avoid clicking right before a screenshot.
  Park the cursor over a blank area (e.g. a `hover` action) immediately before capturing.
- **Cover error/edge states too**, not just the main feature screens (e.g. the 404/500 pages).
- **Watch for near-identical-looking screens that are actually different flows** before assuming
  one screenshot covers both — e.g. the in-app "Passwort ändern" page (user menu, any time) and the
  separate standalone forced-password-change page shown right after a login with
  `passwordChangeRequired` are two distinct components/routes, not one.
- **Screenshots are cropped to just the relevant panel/dialog/table** — sidebar and header removed
  — so that a sidebar/header/theme change doesn't invalidate the whole set at once. The dashboard
  screenshot in `README.md` (`images/dashboard.jpg`) is the one deliberate exception, kept full-page
  to show the overall app layout with sidebar and header. A handful of other screenshots
  (`benutzermenue.jpg`, `support-anfrage.jpg`, `kunden-anspruch-pruefen.jpg`,
  `einstellungen-notschlafstellen-kontakte.jpg`) keep the header specifically because their subject
  — a dropdown or dialog anchored to a header control — visually extends into that region; crop
  those to the sidebar only, not the header. When taking a new screenshot, crop it the same way
  before adding it.
- **Cross-chapter markdown links** (e.g. `[Kunden](kunden.md)`) must stay as plain file links in the
  source `.md` files — that's what makes them work on GitHub/in an IDE. Every chapter file's top
  carries an explicit `<a id="kapitel-<name>"></a>` anchor, and any sub-heading another chapter
  links to directly also gets one matching that link's anchor fragment. The chapter-top anchors are
  named `kapitel-<name>` (not bare `<name>`) because a bare id can collide with an unrelated
  heading's auto-generated slug elsewhere in the merged PDF and silently jump to the wrong place.
  Adding a new cross-file link or a new chapter requires adding/matching an anchor and extending the
  filename list in the `sed` rewrite rules in the `userguide-pdf` job of
  `.github/workflows/release.yml`.

## Architecture Decision Records

`docs/architecture/adr/` holds the ADRs — one record per architectural decision, with the context
that forced it, its cost, and the alternatives that lost. They are the fastest way to find out *why*
something is the way it is (modular monolith, repeatable-only migrations, SSE outbox, zoneless
Angular, ...); `docs/architecture/adr/README.md` is the index.

- An accepted ADR is **not edited** when a decision changes. Write a new one, mark the old one
  `superseded by ADR-NNNN`, link both ways, and update the index.
- A change that reverses or materially narrows a recorded decision needs a new ADR as part of the
  same task — the code and the record must not disagree.
- Longer evaluations of a decision *not yet taken* (e.g. `docs/architecture/audit-trail.md`) are not
  ADRs; they sit one level up in `docs/architecture/` and are listed at the bottom of the ADR index.

## Handling Issues Found Outside the Current Task's Scope

If you notice a bug or problem while working on a task that is **not caused by your current
work** (pre-existing, unrelated to the change you're making):
- **Small and related to the task** (e.g. a nearby off-by-one, a stale comment, a minor layout
  glitch touched by your change): fix it inline as part of the same task.
- **Bigger or unrelated**: don't fix it inline — file a GitHub issue (`gh issue create`) so it can
  be tackled separately, and mention it to the user rather than silently expanding the task's scope.

## Code Conventions

**Documentation describes current state, not history:** CLAUDE.md, module `README.md` files, and
code comments should describe the codebase as it is now, not narrate how it got there. Avoid
phrasing like "moved here from X", "used to live in Y", "originally implemented as Z", or "was
X, now Y" — write the current fact plainly instead (e.g. "the `user` module's login-attempts
screen" rather than "the login-attempts screen, moved here from `settings`"). Git history/blame
and commit messages are the place for that "why did this change" context, not the docs describing
present behavior. This applies to edits made *during* a task too, not just the end state — don't
describe a rename/move you just made as a transition in the docs you're updating for it.

**Template flow-control (project convention):**
- Prefer the repository flow-control-syntax for templates instead of Angular structural directives (*ngFor, *ngIf).
- Use `@for (...) { ... }` and `@if (condition) { ... }` for iteration and conditional rendering in templates to ensure consistent parsing and tooling in this codebase.
- Avoid using `*ngFor` / `*ngIf` unless interacting with third-party examples; convert new code to the flow-control-syntax.


### Backend (Kotlin)
- Package structure: `at.wrk.tafel.admin.backend.modules.<module>.<subpackage>`
- Controllers: Suffix with `Controller`, return response models
- Services: Suffix with `Service`, mark internal services in `internal/` package
- Entities: Suffix with `Entity`, located in `database/model/`
- Repositories: Suffix with `Repository`, use Spring Data JPA
- Models: DTOs bound to a REST endpoint follow the naming convention in [API
  Structure](#rest-dto-naming-convention) below; `Model`/`ResponseModel` filenames (not type names)
  remain fine for the file a DTO group lives in (e.g. `HouseholdResponseModel.kt`)
- Use constructor injection for dependencies
- Use `@Transactional` on service methods that modify data
- Converters in `internal/converter/` package convert entities to models

### Frontend (TypeScript/Angular)
- Use standalone components (not NgModules)
- Component selectors: `tafel-<component-name>`
- Services: Suffix with `.service.ts`
- API services: Suffix with `-api.service.ts`, located in `app/api/`
- Resolvers: Suffix with `-resolver.component.ts`
- Use `inject()` function for dependency injection in components
- Use `HttpClient` for API calls, typed with interfaces
- Reactive forms for all form handling
- Custom validators in `common/validator/`

**Signal-Based Patterns:**
- Use `input()` / `input.required()` for component inputs (not `@Input`)
- Use `output()` for component outputs (not `@Output`)
- Use `signal()` for local component state
- Use `computed()` for derived state (not methods)
- Use `effect()` in constructor for side effects (not `ngOnInit`)
- Use `viewChild()` / `viewChildren()` for template queries (not `@ViewChild`)
- Use `toSignal()` to convert Observables to Signals
- Use `resource()` for data fetching with automatic loading/error states
- Read signals in templates with `()` - e.g., `@if (loading())`
- Application runs in **zoneless mode** - no `ngZone.run()` needed

## Commit Conventions

Commit subjects and PR titles **must** follow [Conventional Commits](https://www.conventionalcommits.org):
`<type>[optional scope][!]: <description>`, e.g. `feat: add sortOrder support to Shelters`,
`fix(customer-pdf): correct address block overflow`.

- type is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`, `revert`
- description doesn't start with an uppercase letter and doesn't end with a period
- full header (the whole subject line) is at most 100 characters
- use `!` after type/scope (e.g. `feat!:`) for a breaking change, not a `BREAKING CHANGE:` footer

This is not just style: `.github/workflows/release.yml`'s `version` job
(`paulhatch/semantic-version`) derives the next release's version (patch/minor/major) straight
from these commit types since the last git tag — `feat`→minor, `!`/`BREAKING CHANGE:`→major,
anything else (including `fix`/`perf`)→patch, which is that action's implicit default level.
A malformed subject means a release mis-bumps or silently falls back to a patch bump.

It's enforced three ways, all with identical rules, so nothing that passes one fails another:
a `commit-msg` hook (`.githooks/commit-msg`, active once `git config core.hooksPath .githooks`
has been run in this clone), the `commitlint` CI job on every PR (lints individual commits), and
the `pr-title-lint` CI job on every PR (lints the PR title itself — needed because this repo
squash-merges with the PR title becoming the final commit, per `squash_merge_commit_title:
PR_TITLE` in the repo settings, so the title is what `release.yml` actually sees, not the PR's
individual commits).

When committing on this repo's behalf, write commit messages and PR titles in this format
without being asked. This is easy to miss in practice, so treat it as a hard checklist item:
before opening or editing a PR, and whenever a CI failure turns out to be
`pr-title-lint`/`commitlint`, check the PR title and commit subjects against these rules yourself
rather than waiting for CI to flag it.

## API Structure

**HTTP Requests Collection (`_http-calls/`):** Before inspecting controller source code, check the `_http-calls/` folder for sample HTTP calls (`.http` files) organized by feature area (customers, distributions, routes, users, etc.). These provide quick insight into request/response shapes, query parameters, and authentication patterns. Use them as a first reference, but always verify against the actual controller endpoints when needed — the `.http` files may not cover every endpoint or edge case.

The backend exposes REST APIs under `/api/` prefix. Update-by-id endpoints use `PUT`, create
endpoints return `201`, delete endpoints return `204` — this is a project-wide convention, not
just a pattern that happens to repeat. SSE endpoints for a given resource live under a sibling
`.../sse/...` controller (e.g. `DistributionController` + `DistributionSseController`) so their
URLs stay stable even as the REST resource's own base path changes.

### REST DTO naming convention

Every type that appears directly in a controller method's signature (a `@RequestBody` parameter,
or the return type once `ResponseEntity<T>`/`PagedResponse<T>`/`XxxListResponse` is unwrapped to
`T`) gets one of exactly three suffixes, decided by how that type is actually used across the API
— not by guessing what "feels" like a request or response:

1. **`Request`** — the type is bound to `@RequestBody` somewhere. If the identical type is *also*
   directly returned (the old "reuse the domain model for both directions" pattern), split it into
   a same-named `XxxRequest`/`XxxResponse` pair rather than reusing one bare type for both (e.g.
   `Car` → `CarRequest`/`CarResponse`, `Household` → `HouseholdRequest`/`HouseholdResponse`). This
   is deliberate churn: it decouples the write and read wire contracts so either can evolve without
   dragging the other along, even though the two classes are field-for-field identical on day one.
2. **`Response`** — the type is returned directly from an endpoint (never a request body) and is
   not merely a list element (see `Item` below). Covers both full resources with no request-body
   counterpart (`Employee` → `EmployeeResponse`) and bare action-result types (e.g.
   `StatisticsResponse`, `DistributionCloseResponse`).
3. **`Item`** — the type is *only* ever the element type of a `PagedResponse<T>` or an
   `XxxListResponse`'s `List<T>` — it never appears as a request body and is never itself returned
   as a standalone single-resource response (`Route` → `RouteItem`, `SchoolStarterPackageEntry` →
   `SchoolStarterPackageItem`). A type that already has a dedicated create/update response role
   (e.g. `HouseholdNoteItem`, created via `POST` and also listed via `PagedResponse`) keeps the
   `Item` suffix rather than splitting into `Request`/`Response` — the "is it ever a request body"
   test is what actually matters, not "does some endpoint return one instance of it directly."

Two established generic wrappers are exempt from all of the above and keep their existing names:
`PagedResponse<T>` (`common/api/PagedResponse.kt`) for paginated lists, and a per-resource
`XxxListResponse` for non-paginated full-list responses.

**Nested value objects** that are embedded fields inside a `Request`/`Response`/`Item` type but are
never *themselves* bound to a controller signature (not a request body, not a controller's direct
return type, not the direct element type of a list endpoint) keep their plain domain name — no
suffix. Examples of single embedded values that stay bare: `Person`, `HouseholdAddress`,
`HouseholdIssuer`. Examples of repeatable-record types that take the `Item` suffix instead:
`HouseholdNoteItem`, `ShelterContactItem`, `StaticValueItem`. Enums never take a suffix.

When a service method needs to operate on data that's structurally identical across a
`Request`/`Response` split (e.g. validating a household's persons list, which exists on both
`HouseholdRequest` and `HouseholdResponse`), prefer taking the narrower shared shape (a
`List<Person>`, not a `Household`) over adding overloads or a shared supertype — see
`HouseholdService.validate`/`mapToValidationPersons`.

- `/api/users`: User management
- `/api/households`: Household (customer) CRUD operations — the frontend's `customer-api.service.ts` calls this and translates to/from the old flat `CustomerData` shape; every other frontend file still just sees `CustomerData`
- `/api/households/{householdId}/notes`: Household notes
- `/api/households/{householdId}/ticket`: Current ticket for a household in the active distribution
- `/api/distributions`: Distribution management (SSE updates on `/api/sse/distributions`)
- `/api/distributions/ticket-screen`: Ticket screen control (SSE on `/api/sse/distributions/ticket-screen/current`)
- `/api/countries`: Country list
- `/api/employees`: Employee management
- `/api/scanners`: Scanner registration (SSE on `/api/sse/scanners/{scannerId}/results`)
- `/api/routes`: Route management
- `/api/food-categories`: Food category management
- `/api/food-collections`: Food collection recording (nested under `/routes/{routeId}` and `/routes/{routeId}/shops/{shopId}`)
- `/api/cars`: Car management
- `/api/shelters`: Shelter management
- `/api/settings`: Application settings
- `/api/support`: Creates a GitHub issue from an in-app support request
- `/api/config`: Deployment-wide frontend config — running version, build time, optional-feature flags (SSE updates on `/api/sse/config`). `/api/config/public` serves the environment label alone and is the one config endpoint reachable without a session (the login page needs it)

Authentication: Basic HTTP auth with JWT token stored in cookie.

## Special Considerations

- **Saturday Deploy Freeze**: `deploy-prod` in `.github/workflows/release.yml` refuses to run for the
  entire day every Saturday (Europe/Vienna time). The app is live-used during Saturday distributions
  (~12:00-24:00) and Flyway migrations run on application boot, so a deploy mid-event would restart
  the app under load — see issue #2931. The `check-deploy-window` job **fails** the release run on a
  Saturday rather than skipping quietly, so a blocked deploy is visible: everything up to and
  including `deploy-test` still succeeds, and prod is deployed by re-running the failed jobs once it
  is no longer Saturday. A red release run whose only failure is `check-deploy-window` means the
  freeze, not a broken build.
- **Path-Aware Pipeline**: `pull_request.yml` and `main_push.yml` gate every job on what the change
  actually touches. `subflow_changes.yml` classifies the changed files into backend / frontend /
  docker image (a change under `.github/workflows/` counts as all three, since only running the
  pipeline proves a pipeline change), and the callers skip the jobs that can say nothing about it.
  So a docs-only change — or a PR title/description edit, which re-triggers the workflow with
  unchanged commits — runs nothing but `commitlint`/`pr-title-lint`, and a run showing build, test,
  e2e and deploy as *skipped* is the intended outcome, not a broken pipeline. The one job not gated
  on its own area is the backend unit test: the Sonar analysis consumes its jacoco report, so it
  runs for any application change, frontend-only included. `release.yml` is deliberately ungated —
  every release produces a new version tag, image and userguide PDF regardless of what changed.
- **Initial Administrator**: a deployment against an empty database has no way in — every account is
  created by an existing administrator. `InitialAdminUserService` (an `ApplicationRunner`) closes
  that by creating one `ADMINISTRATOR` account with `passwordChangeRequired` **while the `users`
  table is completely empty**, and doing nothing otherwise; the password comes from
  `tafeladmin.setup.initialAdmin.password` or, unset, is generated per installation and logged once
  at WARN. Disabled in integration tests (`src/test/resources/application.yml`) so they don't see a
  user they didn't create. See ADR-0035 and the README's "New Installation".
- **Distribution State**: Many features require an active distribution (started but not ended). The backend enforces this via the `@TafelActiveDistributionRequired` marker annotation, checked by a global `HandlerInterceptor` (`TafelActiveDistributionRequiredInterceptor`, not an AOP aspect) registered for all controllers; the frontend uses the `tafelIfDistributionActive` directive.
- **Customer Duplicates**: The system detects potential duplicates based on lastname, firstname, and birthdate. Review duplicate candidates before creating customers. Merging duplicates is a real field-by-field picker plus person/note/distribution-history re-parenting (`HouseholdMergeService`, `views/customer-merge/`), not a deletion - see the household module README.
- **Fuzzy Search**: the customer and user search screens each have one free-text box (`searchInput`)
  rather than per-field inputs. Both match against a denormalized, lower-cased `search_text` column
  that a database trigger keeps in sync (`R__00088_fulltext_search.sql`) — for a household that
  covers its number, the names of *all* its persons, address, phone and e-mail; for a user, username
  plus the linked employee's personnel number and name. Two modes are OR'd: `like '%term%'` for the
  verbatim hit and `strict_word_similarity` (`pg_trgm`, GIN-indexed) for typo tolerance, with results
  ranked verbatim-first — see `SearchTextSpecs`. The cutoff is
  `tafeladmin.search.similarityThreshold`, read per request so it can be tuned without a restart.
  Note the trigger is the only thing maintaining `search_text`: a new searchable column on
  `households`/`persons`/`users`/`employees` has to be added to those trigger functions too, or it
  silently won't be findable.
- **Income Validation**: Customer income is validated against configurable limits. The validation logic is in `IncomeValidatorService`.
- **PDF Generation**: Uses XSL-FO templates in `backend/src/main/resources/pdf-templates/`. PDFs are generated via Apache FOP.
- **Mail Templates**: Thymeleaf templates in `backend/src/main/resources/mail-templates/`.
- **Ticket System**: Customers receive ticket numbers during distributions for organized food collection.
- **Scanner Integration**: Supports handheld scanners for customer check-in via QR codes.
- **Scanner Folder**: Optional per deployment — a NAS share a physical document scanner writes to,
  offered as a second document source on a customer's documents tab. Switched on by
  `tafeladmin.storage.scannerPath` plus the `tafeladmin.features.scannerFolderEnabled` kill switch;
  `TafelAdminStorageProperties.scannerFolderAvailable` is the single rule both sides go by, enforced
  server-side by `ScannerFileService` and reported to the frontend as `/api/config`'s
  `scannerFolderEnabled` so the UI can hide a source the backend would refuse to serve. Both
  settings can be flipped on a running deployment — see Config Hot-Reload below.
- **Config Hot-Reload**: the **whole** configuration is re-read while the application runs — not just
  `tafeladmin.*`. Production's settings come from an operator-managed `config.yml` bind-mounted into
  the container (`-Dspring.config.additional-location`, see `_build/Dockerfile`), and
  `ConfigFileReloadService` polls the config files the app was started with; on a change it runs
  Spring Cloud's `ContextRefresher` (`spring-cloud-context` — the *only* Spring Cloud artifact here:
  no config server, no config client, no bus), which re-reads them through Spring Boot's own
  config-data pipeline and re-binds every `@ConfigurationProperties` bean **in place**, Spring's own
  included. What limits the effect is not the property's prefix but whether anything already
  consumed it — see the first two points below. Things to keep in mind when touching this area:
  - `TafelAdminProperties` and its nested classes are mutable JavaBeans with no-arg constructors on
    purpose. A Kotlin primary constructor with parameters makes Spring Boot deduce value-object
    binding, which silently turns rebinding into a no-op — don't "clean them up" into data classes.
  - Consumers must read the properties **per use**, not copy a value into a field at construction.
    A value that has already been baked into another bean keeps what it was built with and still
    needs a restart — that's why `spring.datasource.url`, the Tomcat connector settings, the
    security filter chain and `tafeladmin.push.vapid*` don't change on a reload, while
    `tafeladmin.features.scannerFolderEnabled` does.
  - `@Value` is **not** refreshed — it is resolved once when the bean is constructed. The one place
    that uses it (`FlywayImportTestdataCallback`'s `tafeladmin.testdata.enabled`) is a startup-only
    concern and correct as it is, but don't reach for `@Value` for anything meant to be reloadable;
    use `@ConfigurationProperties`.
  - `ApplicationProperties` (`security.*`) is intentionally *not* reloadable — it stays a
    constructor-bound data class so a missing JWT secret still fails startup. `LoginAttemptService`
    and `TafelLoginFilter` read it per call, which looks live but isn't; see its KDoc.
  - Nothing is `@RefreshScope`d and `spring.cloud.refresh.extra-refreshable` is unset, so a refresh
    destroys no beans: the Hikari pool and `SseOutboxListenerService`'s dedicated `LISTEN sse_outbox`
    connection survive it untouched. `ConfigRefreshSideEffectsIT` locks that down — re-creating that
    listener would close the connection under its blocked reader (issue #2985) and silently kill
    every open SSE stream. That connection closes itself and nothing else ever closes it, which is
    also why `SseOutboxListenerService.cleanup()` only cancels the job instead of waiting for it.
  - `tafeladmin.configReload.enabled: false` switches the whole mechanism off; it is read at startup
    only. `tafeladmin.configReload.interval` (default 5s) is the poll interval.
  - The frontend follows along: `ConfigChangePublisher` pushes the new `ConfigResponse` over
    `/api/sse/config`, and `ConfigApiService.observeConfig()` is a shared stream of the HTTP response
    plus that SSE feed — components must subscribe to it rather than reading the config once.
- **Real-time Updates**: Dashboard and ticket screen use SSE for live updates without polling.

## Profiles and Configuration

### Backend Profiles

**Default profiles** (in `backend/src/main/resources/application-<profile>.yml`):
- `local`: Development with local PostgreSQL (connection settings required in application-local.yml) and Mailpit for email (SMTP on port 1025, web UI on port 8025)
- `e2e`: E2E testing configuration with test user credentials
- `testdata`: Loads test data via Flyway callback for development

**Local development setup** (via `docker-compose.yml`):
```bash
# Start infrastructure (PostgreSQL, pgAdmin, Mailpit)
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **pgAdmin** on port 5050
- **Mailpit** (SMTP on port 1025, web UI on port 8025)

**Important:** For local development, you need:
1. Docker infrastructure running (or PostgreSQL locally)
2. Database connection configured in `backend/src/main/resources/application-local.yml`
3. Backend running on port 8080 for frontend proxy to work

Frontend proxy configuration: `frontend/src/main/webapp/proxy.conf.json` proxies `/api` to `http://localhost:8080` during development.

## Claude Skills

This repository includes custom skills for Claude Code in the `.claude/skills/` directory:
- **fix-e2e**: Skill for debugging and fixing E2E test failures (automated workflow)
- **process-issue**: Implements a GitHub issue end-to-end (branch, implementation, tests, PR),
  then hands off to process-pr
- **process-pr**: Reviews and fixes an already-open PR, then babysits CI/SonarCloud until green
- **process-dependabot**: Handles Dependabot PRs
- **cleanup-git**: Repo/branch cleanup workflow
- **release**: Release workflow

You can invoke these using `/fix-e2e`, `/process-issue`, `/process-pr`, `/process-dependabot`,
`/cleanup-git`, `/release` in conversations.

## Common Tasks

### Adding a New Feature Module (Backend)
1. Create package under `modules/<module-name>/`
2. Add `package-info.java` with `@ApplicationModule` annotation
3. Create controller, service, and repository layers
4. Add entities in `database/model/<module>/`
5. Create Flyway migration for new tables
6. Add response models

### Adding a New Feature Module (Frontend)
1. Create folder under `modules/<module-name>/`
2. Create `<module>.routes.ts` with route configuration
3. Add views in `views/` subfolder
4. Add reusable components in `components/` subfolder
5. Create API service in `app/api/<module>-api.service.ts`
6. Add resolvers if needed in `resolver/` subfolder
7. Update main routes in `app.routes.ts`

### Creating a New Database Migration
1. Create file `backend/src/main/resources/db-migration/R__XXXXX_<description>.sql`
2. Use next available number for XXXXX (check current highest number in the directory)
3. Include IF NOT EXISTS clauses for repeatability
4. Test migration with clean database
5. **A brand-new entity table needs its own `<table>_seq` sequence in the same migration** (e.g.
   `create sequence if not exists <table>_seq start with 1 increment by 50 owned by <table>.id;`).
   Hibernate's `id.db_structure_naming_strategy` is `standard` here (see
   `R__00070_migrate_id_sequences.sql`), so every `@GeneratedValue` entity requires a matching
   `<table>_seq` — without it, inserts fail at runtime with `relation "<table>_seq" does not exist`.
   A MockK-based unit test with a mocked repository will not catch this; only a real Postgres run
   (an `*IT.kt` test via `TafelBaseIntegrationTest`, or manual testing) will.
6. **Never edit a migration that is already released to production — always add a new one.** Every
   script here is a Flyway *repeatable* migration, so changing one changes its checksum and Flyway
   re-runs it against databases where it long since ran; against a schema that has moved on, those
   statements fail and the application does not boot. This holds even when the edit looks purely
   cosmetic or like a tidy-up (removing an `add column` for a column that is being dropped again,
   reformatting, fixing a comment). To undo something an old migration did, write a new
   `R__XXXXX_<description>.sql` that does the undoing (e.g.
   `R__00087_drop_persons_in_shelter_count.sql` dropping a column `R__00044` added) and leave the
   old file byte-for-byte alone. The one exception is a migration added on the current branch and
   not yet merged/released — that one is still yours to edit.

### Adding a New Permission
1. Add permission to `UserPermissions` enum in backend
2. Update `application.yml` with permission description
3. Add permission check in controller with `@PreAuthorize`
4. Update frontend permission checks in guards and directives
5. Update user creation UI to include new permission
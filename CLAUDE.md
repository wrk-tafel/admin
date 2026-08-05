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

The backend uses **Spring Modulith** architecture with 8 core feature modules, each with explicit boundaries enforced via `package-info.java` annotations:

- **household**: Household/person management (business package still called `household`, DB tables `households`/`persons`) with income validation, duplicate detection, PDF generation (ID cards, master data). A household is the case record (business number, address, contact, validity/lock/cost-contribution state); it has one or more persons, exactly one of which is flagged as the main person. Note: the frontend module is still named `customer` and its DTOs still use the old flat "customer + additionalPersons" shape on purpose (see Frontend Architecture and API Structure below) — only `customer-api.service.ts` knows about the household/person split.
- **distribution**: Food distribution events with ticket management, statistics, and post-processors for emails/reports
- **logistics**: Routes, food collections, shelters, shops, cars, and food category management
- **checkin**: Scanner registration and customer check-in via QR codes
- **dashboard**: Overview page with real-time updates, registered customers, and distribution state
- **reporting**: Statistics exports (CSV), daily reports (PDF), age/country/household distributions
- **settings**: Application configuration and mail recipient management
- **support**: In-app support contact form that files a GitHub issue on the user's behalf
- **base**: Shared utilities (countries, employees, exception handling, release version). Its
  entities live in `database/model/base/`, but each utility is also its own `@NamedInterface`
  submodule under `modules/base/{country,employee,exception,version}/` for other modules to
  depend on

**Layering Pattern:**
- Controllers: REST endpoints with `@PreAuthorize` method-level security
- Services: Business logic with `@Transactional` boundaries
- Repositories: Spring Data JPA with custom specifications for complex queries
- Entities: Located in `database/model/` with Flyway migrations in `resources/db-migration/`

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
- Post-processor chain for distribution events (DailyReportMailPostProcessor, StatisticMailPostProcessor, etc.)
- Converter pattern for entity-to-DTO mapping
- Custom validators for income limits and customer validation
- Base entities with change tracking (created/updated timestamps, employee references)

### Frontend Architecture

The frontend is an Angular single-page application using Angular Material and Tailwind CSS as the UI framework.

**Feature Modules:**
- **dashboard**: Overview with distribution state, registered customers, food amounts, statistics input
- **customer**: Search, create, edit, detail views with duplicate detection. Deliberately *not* renamed to match the backend's `household`/`person` model — routes, components, and `CustomerData`/`CustomerAddPersonData` DTOs are unchanged; only `customer-api.service.ts` translates to/from the backend's household+persons wire shape (main person flattened onto the customer object, other persons as `additionalPersons`)
- **checkin**: Scanner registration, QR code reading, ticket screen for customer calls
- **logistics**: Food collection recording only (desktop/responsive layouts), one screen (`warenerfassung`). Route/shelter/shop/car/food-category admin CRUD screens actually live under the **settings** module below, not here.
- **user**: User search, create, edit with password change functionality
- **settings**: System settings and mail recipient configuration, plus admin CRUD screens for shelters (`notschlafstellen`) and food categories (`lebensmittelkategorien`), both with drag-and-drop sortOrder reordering (Angular CDK)
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
- Run specific test: `./gradlew :backend:test --tests "*CustomerServiceTest.createCustomerSuccessful"`
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
- **A change to a part shared across pages — header, footer, or sidebar/navigation — invalidates
  every screenshot that shows it**, not just the screens the change was made for. Almost every
  screenshot in this guide includes the sidebar, so check `docs/userguide/images/` broadly and
  retake whichever ones now show a stale header/footer/sidebar, even in chapters your change didn't
  otherwise touch.
- **Cross-chapter markdown links** (e.g. `[Kunden](kunden.md)`) must stay as plain file links in the
  source `.md` files — that's what makes them work on GitHub/in an IDE. Every chapter file's top
  carries an explicit `<a id="kapitel-<name>"></a>` anchor, and any sub-heading another chapter
  links to directly also gets one matching that link's anchor fragment. The chapter-top anchors are
  named `kapitel-<name>` (not bare `<name>`) because a bare id can collide with an unrelated
  heading's auto-generated slug elsewhere in the merged PDF and silently jump to the wrong place.
  Adding a new cross-file link or a new chapter requires adding/matching an anchor and extending the
  filename list in the `sed` rewrite rules in the `userguide-pdf` job of
  `.github/workflows/release.yml`.

## Handling Issues Found Outside the Current Task's Scope

If you notice a bug or problem while working on a task that is **not caused by your current
work** (pre-existing, unrelated to the change you're making):
- **Small and related to the task** (e.g. a nearby off-by-one, a stale comment, a minor layout
  glitch touched by your change): fix it inline as part of the same task.
- **Bigger or unrelated**: don't fix it inline — file a GitHub issue (`gh issue create`) so it can
  be tackled separately, and mention it to the user rather than silently expanding the task's scope.

## Code Conventions

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

Authentication: Basic HTTP auth with JWT token stored in cookie.

## Special Considerations

- **Distribution State**: Many features require an active distribution (started but not ended). The backend enforces this via the `@TafelActiveDistributionRequired` marker annotation, checked by a global `HandlerInterceptor` (`TafelActiveDistributionRequiredInterceptor`, not an AOP aspect) registered for all controllers; the frontend uses the `tafelIfDistributionActive` directive.
- **Customer Duplicates**: The system detects potential duplicates based on lastname, firstname, and birthdate. Review duplicate candidates before creating customers. Merging duplicates is a real field-by-field picker plus person/note/distribution-history re-parenting (`HouseholdMergeService`, `views/customer-merge/`), not a deletion - see the household module README.
- **Income Validation**: Customer income is validated against configurable limits. The validation logic is in `IncomeValidatorService`.
- **PDF Generation**: Uses XSL-FO templates in `backend/src/main/resources/pdf-templates/`. PDFs are generated via Apache FOP.
- **Mail Templates**: Thymeleaf templates in `backend/src/main/resources/mail-templates/`.
- **Ticket System**: Customers receive ticket numbers during distributions for organized food collection.
- **Scanner Integration**: Supports handheld scanners for customer check-in via QR codes.
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

### Adding a New Permission
1. Add permission to `UserPermissions` enum in backend
2. Update `application.yml` with permission description
3. Add permission check in controller with `@PreAuthorize`
4. Update frontend permission checks in guards and directives
5. Update user creation UI to include new permission
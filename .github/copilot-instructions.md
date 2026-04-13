# GitHub Copilot Instructions for wrk-tafel/admin

Purpose: quick, focused guidance for Copilot sessions working in this repository.

1) Build, test & lint (how to run single tests)
- Full build (root):
  ./gradlew build
- Backend build/run:
  ./gradlew :backend:build
  ./gradlew :backend:bootRun --args='--spring.profiles.active=local'
- Backend: run tests
  All tests: ./gradlew :backend:test
  Single test class: ./gradlew :backend:test --tests "at.wrk.tafel.admin.backend.modules.customer.internal.CustomerServiceTest"
  Single test method: ./gradlew :backend:test --tests "*CustomerServiceTest.createCustomerSuccessful"
- Frontend (frontend/src/main/webapp):
  npm install
  Dev server: npm run dev
  Unit tests (watch): npm test
  Headless/CI: npm run test-ci
  Single test file: npm test -- --include="src/app/common/sse/sse.service.spec.ts"
  Build (prod): npm run build-prod
  Lint: npm run lint
- Dependency verification (important when updating Gradle deps):
  ./gradlew --write-verification-metadata sha256 --refresh-dependencies

2) High-level architecture (big picture)
- Backend: modular monolith using Spring Modulith. Feature modules live under backend/src/main/kotlin/.../modules. Each module exposes Controllers → Services → Repositories; entities live in database/model and schemas are managed by Flyway (resources/db-migration).
- Frontend: Angular 21 SPA (standalone components, zoneless) under frontend/src/main/webapp. Uses signal-based patterns (signal(), computed(), resource()) and CoreUI + Tailwind.
- Runtime integrations: PostgreSQL (Flyway), SSE outbox pattern for real-time events, Apache FOP for PDFs, Testcontainers for backend integration tests, Cypress for E2E.

3) Key conventions and repository-specific patterns
- Backend modules: add package-info.java with @ApplicationModule; package layout: modules/<feature>/{controller,service,repository,internal}
- Naming: Controllers end with Controller, Services with Service, Repositories with Repository, Entities with Entity, DTOs suffixed Model/ResponseModel.
- Flyway migrations: backend/src/main/resources/db-migration/R__XXXXX_<description>.sql. Prefer IF NOT EXISTS for repeatable scripts.
- Permissions: string-based permission constants (CUSTOMER, SCANNER, CHECKIN, LOGISTICS, USER_MANAGEMENT, SETTINGS). Controllers use @PreAuthorize.
- Distribution state: many endpoints require an active distribution (see @ActiveDistributionRequired). Frontend directive: tafelIfDistributionActive.
- SSE & outbox: use sse_outbox table and outbox post-processors for reliable real-time updates.
- Frontend component patterns: standalone components, use input()/output() instead of @Input/@Output, use signals for local state, use toSignal() to adapt Observables.
- File/route conventions: feature modules under modules/<feature> with components/, views/, services/, resolver/ and <feature>.routes.ts
- API services: placed in app/api and named *-api.service.ts
- E2E/Cypress: cypress config under frontend/src/main/webapp/cypress and scripts npm run cy:run-ci / npm run cy:open-local

4) Useful locations to consult
- Quick HTTP examples: _http-calls/ (*.http)
- CI config: .github/workflows/
- CLAUDE.md contains a detailed developer cheat sheet for builds, tests, and conventions — consult it when more context is needed.

5) When responding as Copilot in this repo
- Prefer Gradle commands for backend tasks (./gradlew) and npm scripts inside frontend/src/main/webapp for frontend tasks.
- When asked to edit code, follow repository conventions above (module boundaries, package-info annotations, naming).
- For tests, run the minimal focused Gradle/npm test command shown above rather than full-suite unless requested.

If this file already exists, integrate its content instead of overwriting. For changes, propose diffs rather than silent replacement.

---

Notes: created from README.md and CLAUDE.md. For additions (lint rules, special CI flags), request specifics and Copilot can patch this file.

6) MCP servers
- Configured MCP server for Cypress: .github/mcp-servers/cypress-server.json
  - Commands: run_headless -> npm run cy:run-ci, open_ui -> npm run cy:open-local
  - Assumes backend available at http://localhost:8080 (use ./gradlew :backend:bootRun --args='--spring.profiles.active=e2e')
  - CI integration hints included in the JSON file

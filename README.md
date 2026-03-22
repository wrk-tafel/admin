# Tafel Admin

Administration system for food banks (Tafel) to manage customer registrations, food distributions, logistics operations, and reporting. Built for Austrian food bank operations with German locale (de-AT) and Euro currency.

[![CI](https://github.com/wrk-tafel/admin/actions/workflows/main_push.yml/badge.svg)](https://github.com/wrk-tafel/admin/actions/workflows/main_push.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.txt)

## Features

- **Customer Management** - Registration, income validation, duplicate detection, PDF ID card generation
- **Food Distribution** - Distribution events with ticket numbering (1-999), customer check-in, and real-time ticket screen
- **Scanner Check-in** - QR code scanning for customer check-in via handheld scanners
- **Logistics** - Routes, food collections, shelters, shops, and vehicle management
- **Reporting** - Daily reports (PDF), statistics exports (CSV), demographic distributions
- **Dashboard** - Real-time overview with SSE-powered live updates
- **User Management** - Role-based access control with configurable permissions

## Tech Stack

### Backend

| Technology | Version |
|---|---|
| Java (Amazon Corretto) | 25 |
| Kotlin | 2.3.10 |
| Spring Boot | 4.0.4 |
| Spring Modulith | 2.0.4 |
| PostgreSQL | 18.2 |
| Gradle | 9.4.0 |

### Frontend

| Technology | Version |
|---|---|
| Angular | 21 |
| TypeScript | 5.9 |
| CoreUI | 5.6 |
| Bootstrap | 5.3 |
| RxJS | 7.8 |
| Chart.js | 4.5 |

## Prerequisites

- Java 25 (Amazon Corretto recommended)
- Node.js >= 20.19 (24.x recommended, see `.nvmrc`)
- npm >= 10.9
- Docker & Docker Compose (for local PostgreSQL and mail server)

## Getting Started

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **pgAdmin** on port 5050
- **Mailpit** (SMTP on port 1025, web UI on port 8025)

### 2. Start Backend

```bash
./gradlew :backend:bootRun --args='--spring.profiles.active=local'
```

To load test data for development:

```bash
./gradlew :backend:bootRun --args='--spring.profiles.active=local,testdata'
```

The backend starts on http://localhost:8080, management endpoints on port 8081.

### 3. Start Frontend

```bash
cd frontend/src/main/webapp
npm install
npm run dev
```

The frontend dev server starts on http://localhost:4200 and proxies API requests to the backend on port 8080.

## Building

```bash
# Full build (backend + frontend)
./gradlew build

# Backend only
./gradlew :backend:build

# Frontend only
./gradlew :frontend:build

# Quick compile check (no tests)
./gradlew :backend:compileKotlin
```

### Docker Image

```bash
./gradlew :backend:bootJar
docker build -t wrk-tafel-admin:local -f _build/Dockerfile .
```

The Docker image runs on Amazon Corretto 25 Alpine with timezone set to `Europe/Vienna`.

## Testing

### Backend

```bash
# All tests (unit + integration)
./gradlew :backend:test

# Specific test class
./gradlew :backend:test --tests "at.wrk.tafel.admin.backend.modules.customer.internal.CustomerServiceTest"

# Specific test method
./gradlew :backend:test --tests "*CustomerServiceTest.createCustomerSuccessful"
```

Integration tests use Testcontainers to start PostgreSQL automatically.

### Frontend Unit Tests

```bash
cd frontend/src/main/webapp

# Watch mode
npm test

# Headless (CI)
npm run test-ci

# Specific file
npm test -- --include="src/app/common/sse/sse.service.spec.ts"
```

### E2E Tests

Requires the backend running on port 8080 with the `e2e` profile:

```bash
./gradlew :backend:bootRun --args='--spring.profiles.active=e2e'
```

Then in another terminal:

```bash
cd frontend/src/main/webapp

# Headless
npm run cy:run-ci

# Cypress UI
npm run cy:open-local
```

### Linting

```bash
cd frontend/src/main/webapp
npm run lint
```

## Project Structure

```
admin/
├── backend/                        # Spring Boot/Kotlin backend
│   └── src/main/
│       ├── kotlin/.../modules/     # Feature modules (Spring Modulith)
│       │   ├── base/               #   Shared utilities, countries, employees
│       │   ├── checkin/            #   Scanner registration, QR check-in
│       │   ├── customer/           #   Customer CRUD, income validation, PDFs
│       │   ├── dashboard/          #   Real-time overview, SSE
│       │   ├── distribution/       #   Distribution events, tickets, statistics
│       │   ├── logistics/          #   Routes, food collections, shelters
│       │   ├── reporting/          #   CSV/PDF reports, statistics exports
│       │   └── settings/           #   App configuration, mail recipients
│       └── resources/
│           ├── db-migration/       #   Flyway SQL migrations
│           ├── pdf-templates/      #   XSL-FO templates for PDF generation
│           └── mail-templates/     #   Thymeleaf email templates
├── frontend/                       # Angular frontend
│   └── src/main/webapp/
│       ├── src/app/
│       │   ├── api/                #   API service layer
│       │   ├── common/             #   Shared services, directives, validators
│       │   └── modules/            #   Feature modules
│       │       ├── checkin/
│       │       ├── customer/
│       │       ├── dashboard/
│       │       ├── logistics/
│       │       ├── settings/
│       │       ├── statistics/
│       │       └── user/
│       └── cypress/                #   E2E tests
├── _build/                         # Dockerfile
├── _http-calls/                    # HTTP request examples for API testing
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.yml              # Local development infrastructure
├── build.gradle.kts                # Root Gradle build
├── settings.gradle.kts             # Gradle multi-project settings
└── gradle/
    ├── libs.versions.toml          # Centralized dependency versions
    └── verification-metadata.xml   # Dependency verification checksums
```

## Architecture

### Backend

The backend follows a **modular monolith** architecture using Spring Modulith. Each module has explicit boundaries enforced via `@ApplicationModule` annotations in `package-info.java` files.

**Layering within each module:**
- **Controllers** - REST endpoints with `@PreAuthorize` method-level security
- **Services** - Business logic with `@Transactional` boundaries
- **Repositories** - Spring Data JPA with custom specifications
- **Entities** - JPA entities in `database/model/` with Flyway-managed schemas

**Key patterns:**
- Outbox pattern for reliable SSE event publishing
- Post-processor chain for distribution event side effects (emails, reports)
- Converter pattern for entity-to-DTO mapping
- Custom validators for income limits and customer data

### Frontend

Angular single-page application using standalone components in zoneless mode with signal-based reactivity patterns.

**Key patterns:**
- Lazy-loaded feature modules with route guards
- `input()` / `output()` / `signal()` / `computed()` for component state
- SSE service for real-time backend updates
- Custom directives for permission checks and distribution state

## Dependency Verification

Gradle dependency verification is configured via `gradle/verification-metadata.xml`. When updating dependencies, always regenerate this file with `--refresh-dependencies` to avoid missing checksums:

```bash
./gradlew --write-verification-metadata sha256 --refresh-dependencies
```

Without `--refresh-dependencies`, Gradle uses locally cached artifacts and may skip recording checksums for `.module` files, causing CI failures.

## CI/CD

The project uses GitHub Actions with the following pipelines:

| Workflow | Trigger | Actions |
|---|---|---|
| Pull Request | PR opened/updated | Build, test, Docker image (`dev`), E2E tests, deploy to dev |
| Main Push | Push to `main` | Build, test, Docker image (`test`), E2E tests, deploy to test |
| Release | Push to `release` | Build, test, Docker images (`test` + `latest`), deploy to test + prod |

Code quality is monitored via SonarCloud with JaCoCo coverage reports.

## Configuration

### Backend Profiles

| Profile | Purpose |
|---|---|
| `local` | Local development (PostgreSQL on localhost, Mailpit for email) |
| `testdata` | Loads test data via Flyway callback |
| `e2e` | E2E testing with test user credentials |

### Permissions

Access control is based on these permissions:

- `CUSTOMER` - Customer management
- `SCANNER` - Scanner device access
- `CHECKIN` - Check-in operations
- `LOGISTICS` - Logistics management
- `USER_MANAGEMENT` - User administration
- `SETTINGS` - System settings

## License

This project is licensed under the MIT License. See [LICENSE.txt](LICENSE.txt) for details.

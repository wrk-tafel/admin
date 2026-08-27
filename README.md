# Tafel Admin

Administration system for food banks (Tafel) to manage customer registrations, food distributions, logistics operations, and reporting. Built for Austrian food bank operations with German locale (de-DE) and Euro currency.

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
|---|---------|
| Java (Amazon Corretto) | 26      |
| Kotlin | 2.3.10  |
| Spring Boot | 4.0.4   |
| Spring Modulith | 2.0.4   |
| PostgreSQL | 18.4    |
| Gradle | 9.4.0   |

### Frontend

| Technology | Version |
|---|---|
| Angular | 22 |
| TypeScript | 6.0 |
| Angular Material | 22 |
| Tailwind CSS | 4.3 |
| RxJS | 7.8 |
| Chart.js | 4.5 |

## Prerequisites

- Java 26 (Amazon Corretto recommended)
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

Backend and frontend are built independently, with no Gradle cross-dependency between them.

```bash
# Backend
./gradlew :backend:build

# Quick compile check (no tests)
./gradlew :backend:compileKotlin

# Frontend
cd frontend/src/main/webapp
npm run build-prod
```

### Docker Image

The backend jar and frontend build are independent artifacts, combined only at image-build time:

```bash
./gradlew :backend:build
cd frontend/src/main/webapp && npm run build-prod && cd -
mkdir -p artifact frontend-dist
cp backend/build/libs/admin-backend.jar artifact/
cp -r frontend/src/main/webapp/dist/browser/* frontend-dist/
docker build -t wrk-tafel-admin:local -f _build/Dockerfile .
```

The Docker image runs on Amazon Corretto 26 Alpine with timezone set to `Europe/Vienna`.

## New Installation

A new installation needs nothing but the image and an **empty PostgreSQL database**. Flyway creates
the whole schema on first start and the migrations bring the reference data the application needs to
run with it (countries, income limits and the other static values). Everything else — employees,
users, food categories, shelters, cars, routes and shops, mail recipients — is created from the UI
afterwards.

### 1. Provide a configuration file

The image reads `/app/config/config.yml` (bind-mounted, see [Configuration](#configuration)). The
minimum a deployment has to supply is the database connection and the JWT settings — the application
refuses to start without them:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://<database-host>:5432/tafeladmin
    username: tafeladmin
    password: <database-password>
  # Optional, but nothing can be mailed out without it (daily reports, statistics, support requests).
  mail:
    host: <smtp-host>
    port: 587
    username: <smtp-user>
    password: <smtp-password>

security:
  jwtToken:
    issuer: https://tafel-admin.example.com
    audience: wrk-tafel
    secret:
      # Any sufficiently long random string, e.g. `openssl rand -hex 64`. Keep it stable - changing
      # it invalidates every session.
      value: <random-secret>

tafeladmin:
  environmentLabel: ""          # e.g. "TEST"; shown in the UI and the PWA title
  server:
    relativeBaseUrl: /          # must match the reverse proxy, see below
  mail:
    from: tafel-admin@example.com
  support:
    # Where the in-app support form sends to. Without a recipient the form fails with a clear error.
    recipients:
      - support@example.com
```

### 2. Start it against the empty database

```yaml
services:
  database:
    image: "postgres:18-bookworm"
    environment:
      POSTGRES_USER: tafeladmin
      POSTGRES_PASSWORD: <database-password>
      POSTGRES_DB: tafeladmin
    volumes:
      - database-data:/var/lib/postgresql

  admin:
    image: ikt01toet1030/wrk-tafel-admin:latest
    restart: unless-stopped
    depends_on:
      - database
    ports:
      - "8080:8080"   # application
      - "8081:8081"   # management endpoints (health, metrics)
    volumes:
      - ./config.yml:/app/config/config.yml
      - admin-logs:/app/logs
      - admin-documents:/app/documents

volumes:
  database-data:
  admin-logs:
  admin-documents:
```

### 3. Log in with the initial administrator

While the `users` table is completely empty, the application creates one administrator account at
startup so the installation can be logged into and configured — otherwise a brand-new database would
come up with no way in at all. The generated password is printed to the log exactly once:

```bash
docker compose logs admin | grep "initial administrator"
```

```
... Created initial administrator 'admin' with the generated password 'aB3xY7qm' - log in with it now and change it, this is the only time it is shown.
```

Log in as `admin` with that password; the application forces a password change before anything else
can be done. Then create the real employees and user accounts under *Einstellungen* and *Benutzer*.

Things worth knowing about this bootstrap:

- It only ever fires while there is **no user at all**. An installation that already has users is
  never touched, whatever is configured — including on every subsequent restart of a new one.
- To pick the password up front instead of reading it from the log (unattended rollouts), set
  `tafeladmin.setup.initialAdmin.password`. It has to satisfy the same rules as any other password,
  and startup fails with those rules listed if it doesn't. The account still has to change it at
  first login.
- Username, personnel number and name of the account can be set via
  `tafeladmin.setup.initialAdmin.{username,personnelNumber,firstname,lastname}`, and the whole
  mechanism switched off with `tafeladmin.setup.initialAdmin.enabled: false`.

See [ADR-0035](docs/architecture/adr/0035-first-run-bootstraps-an-administrator-account.md) for why
it works this way rather than shipping a seeded account in a migration.

## Testing

### Backend

```bash
# All tests (unit + integration)
./gradlew :backend:test

# Specific test class
./gradlew :backend:test --tests "at.wrk.tafel.admin.backend.modules.household.internal.HouseholdServiceTest"

# Specific test class (wildcard, useful since test method names use backtick display names)
./gradlew :backend:test --tests "*HouseholdServiceTest"
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
│       │   ├── dashboard/          #   Real-time overview, SSE
│       │   ├── distribution/       #   Distribution events, tickets, statistics
│       │   ├── household/          #   Household/person CRUD, income validation, PDFs
│       │   ├── logistics/          #   Routes, food collections, shelters
│       │   ├── reporting/          #   CSV/PDF reports, statistics exports
│       │   ├── settings/           #   App configuration, mail recipients
│       │   └── support/            #   In-app support form, mailed with the browser's context
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
- Event listener pattern for distribution close: stats/cost-contribution work runs synchronously in-module, then a `DistributionClosedEvent` is published for `reporting` to pick up async
- Converter pattern for entity-to-DTO mapping
- Custom validators for income limits and household/person data

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
| Pull Request | PR opened/updated | Build, test, E2E tests, Docker image (tagged with the PR head's short commit SHA), deploy to dev |
| Main Push | Push to `main` | Build, test, E2E tests, Docker image (tagged with the short commit SHA), deploy to dev + test |
| Release | Push to `release` | Build, test, E2E tests, Docker image (`<version>` + `latest`), user guide PDF, GitHub release, deploy to dev + test + prod |

Each of those deploys is recorded against a GitHub environment (`dev`, `test`, `prod`), so the
repository's **Deployments** page is the record of what runs where. Every deploy is automatic —
nothing waits for an approval, and there is no way to deploy a chosen build to a chosen environment
by hand. Dev is written by all three pipelines and is last-writer-wins: a pull request puts its own
build there to be looked at, and the next merge to `main` puts the merged state back.

See [ADR-0043](docs/architecture/adr/0043-every-environment-deploys-automatically.md) for why
promotion works this way and which of these deploys is actually gated on a green pipeline.

Code quality is monitored via SonarCloud with JaCoCo coverage reports.

## Configuration

### Backend Profiles

| Profile | Purpose |
|---|---|
| `local` | Local development (PostgreSQL on localhost, Mailpit for email) |
| `testdata` | Loads test data via Flyway callback |
| `e2e` | E2E testing with test user credentials |

### Reverse Proxy Deployment (Subpath / Subdomain)

The frontend is built once and the same artifact is deployed unchanged behind a reverse proxy, whether it's mounted at a **subpath** on a shared domain (e.g. multiple environments under one domain) or given its own **subdomain** (the app owns the whole host). Which one is in play is controlled by a single backend property:

```yaml
tafeladmin:
  server:
    relativeBaseUrl: /tafel-admin/   # "/" for a subdomain / root deployment
```

This must match whatever prefix the reverse proxy exposes to the browser. It drives both the JWT cookie path and the frontend's `<base href>` (rewritten server-side by `IndexHtmlController` - see #2972/#2978), so relative asset and API URLs keep resolving correctly once the proxy has stripped its prefix.

Both examples below reference `$sse_cache_control` for the SSE-specific `Cache-Control` header. Declare this `map` once at the `http {}` level of your nginx config (outside any `server {}` block) - it's not repeated per example, but both need it:

```nginx
# See the note below on why this is a map rather than a plain `if`.
map $request_uri $sse_cache_control {
    default      "";
    "~*api/sse"  "no-cache, no-transform";
}
```

Both examples proxy to `<backend-host>:8080` - replace that placeholder with wherever your backend is actually reachable (a Docker Compose service name, a container IP, a VM hostname, ...). If that address can change at runtime, resolve it via a `resolver` directive and a variable rather than a static `proxy_pass` target, since nginx otherwise resolves a static hostname once and caches it for the life of the worker process:

```nginx
resolver 127.0.0.11 valid=30s;  # your DNS server's IP - 127.0.0.11 shown here is Docker's embedded DNS
set $upstream http://<backend-host>:8080;
# ...
proxy_pass $upstream;
```

If your backend address is stable (a fixed IP or a hostname that won't change), skip the `resolver`/`set` and use `proxy_pass http://<backend-host>:8080;` directly instead.

#### Subpath example

nginx strips the `/tafel-admin/` prefix before forwarding to the backend, and passes it along separately via `X-Forwarded-Prefix` (not currently consumed by the app, but kept for parity/future use and general reverse-proxy convention):

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name tafel-admin.example.com;

    resolver 127.0.0.11 valid=30s;

    location /tafel-admin/ {
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Port   443;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Prefix /tafel-admin;
        proxy_set_header Forwarded          '';

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;

        # Logic for re-resolution and path stripping
        set $upstream http://<backend-host>:8080;
        rewrite ^/tafel-admin/(.*) /$1 break;

        # SSE-Specific Optimization
        add_header Cache-Control $sse_cache_control;

        proxy_pass $upstream;
    }
}
```

Matching backend config: `tafeladmin.server.relativeBaseUrl: /tafel-admin/`.

#### Subdomain example

A subdomain owns the whole host, so there's no prefix to strip and `relativeBaseUrl` stays at its default (`/`):

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name tafeladmin.example.com;

    resolver 127.0.0.11 valid=30s;

    location / {
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Port   443;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header Forwarded          '';

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;

        set $upstream http://<backend-host>:8080;

        add_header Cache-Control $sse_cache_control;

        proxy_pass $upstream;
    }
}
```

Both examples were verified end-to-end (path stripping, forwarded headers, and the SSE header) against nginx proxying to a real backend container; swap in your own backend address before using them.

> [!NOTE]
> The SSE header is set via a `map` rather than the more obvious `if ($request_uri ~* "api/sse") { add_header ...; }`. With `proxy_buffering off` (required here for SSE to stream at all), an `add_header` set inside an `if` block is silently dropped - it never reaches the client, with no error logged. An unconditional `add_header`, or one driven by a `map` variable like above, isn't affected and works reliably. This was confirmed by reproducing both the failure and the fix directly against nginx.

## Documentation

A German-language user guide (Benutzerhandbuch) covering every feature is available as Markdown under [`docs/userguide/`](docs/userguide/README.md), with a PDF version attached to every GitHub release. This link always resolves to the PDF from the latest release:

[📄 Benutzerhandbuch (PDF, latest release)](https://github.com/wrk-tafel/admin/releases/latest/download/tafel-admin-benutzerhandbuch.pdf)

Architecture decisions are recorded as ADRs under
[`docs/architecture/adr/`](docs/architecture/adr/README.md) — one record per decision, covering the
modular monolith, the database-only infrastructure, the migration and API conventions, the SSE
outbox, the frontend generation, the release process and more.

[`docs/scheduled-jobs.md`](docs/scheduled-jobs.md) lists every `@Scheduled` job with its schedule and
coordination mechanism (row-claim vs. `@SchedulerLock`, see
[ADR-0047](docs/architecture/adr/0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md)) —
a living inventory kept in sync as jobs are added, removed or retimed, unlike an ADR.

## License

This project is licensed under the MIT License. See [LICENSE.txt](LICENSE.txt) for details.

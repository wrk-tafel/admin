# Contributing

This project is a solo/hobby-maintained food bank admin system, but the same conventions apply
whether you're a future-you or an external contributor. This guide distills the setup, workflow,
and conventions already documented in [README.md](README.md) and [AGENTS.md](AGENTS.md) into a
single checklist.

## Setup

See [README.md](README.md#prerequisites) and [README.md](README.md#getting-started) for
prerequisites (Java 26, Node.js, Docker) and the local dev loop (start infra with
`docker compose up -d`, backend with `./gradlew :backend:bootRun --args='--spring.profiles.active=local'`,
frontend with `npm run dev`).

Also enable the repo's git hooks once per clone, which enforce the commit message convention
below before you commit rather than only finding out in CI:

```bash
git config core.hooksPath .githooks
```

## Before opening a PR

Run the checks locally that CI will otherwise catch:

```bash
# Backend: compile, lint, test
./gradlew :backend:compileKotlin
./gradlew :backend:test

# Frontend: lint, unit tests
cd frontend/src/main/webapp
npm run lint
npm run test-ci
```

Both backend and frontend changes should include tests. Backend unit tests are `*Test.kt`,
integration tests (Testcontainers-backed) are `*IT.kt`; frontend unit tests are `*.spec.ts`
(Vitest) and E2E flows live in `cypress/e2e/` (Cypress, requires the backend running with the
`e2e` profile — see [README.md](README.md#e2e-tests)).

## Enforced conventions

A few conventions are enforced by automated checks, not just style guides — violating them fails
the build, not just a review comment:

- **ktlint** (backend): run via the Gradle build; fix violations with `./gradlew :backend:ktlintFormat`.
- **ArchUnit rules** (backend, `backend/src/test/kotlin/.../architecture/`): enforce naming
  conventions (`*Controller`, `*Service`, `*Repository`, `*Entity`) and REST controller conventions
  (e.g. `@RequestMapping` path rules). These run as part of `:backend:test`.
- **eslint-plugin-boundaries** (frontend, `eslint.config.js`): enforces module boundaries between
  `app/modules/*` — don't reach into another feature module's internals; go through its public
  API/service instead.
- **Spring Modulith module boundaries** (backend, `package-info.java` per module): each module
  declares `allowedDependencies`; adding a new cross-module import that isn't declared there will
  fail module verification. See the per-module `README.md` files under
  `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/*/` for what each module exposes.

## Code conventions

See [AGENTS.md](AGENTS.md#code-conventions) for the full list (naming suffixes, package layout,
Angular signal-based patterns, template flow-control syntax). The short version:

- Backend: constructor injection, `@Transactional` on mutating service methods, converters in
  `internal/converter/` for entity-to-DTO mapping.
- Frontend: standalone components only (no NgModules), `input()`/`output()`/`signal()`/`computed()`
  instead of the decorator-based equivalents, `@for`/`@if` instead of `*ngFor`/`*ngIf`.

## Commit / PR style

- Commit subjects and PR titles follow [Conventional Commits](https://www.conventionalcommits.org):
  `<type>[optional scope][!]: <description>`, e.g. `feat: add sortOrder support to Shelters`,
  `fix(customer-pdf): correct address block overflow`. Rules, identical across all three checks
  below so nothing that passes one fails another:
  - type is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
    `chore`, `revert`
  - description doesn't start with an uppercase letter and doesn't end with a period
  - full header is at most 100 characters
  This isn't just style — `release.yml`'s `version` job (`paulhatch/semantic-version`) derives the
  next release's version (patch/minor/major) straight from these commit types since the last tag
  (`feat`→minor, `!`/`BREAKING CHANGE`→major, anything else→patch), so a malformed subject means
  a release mis-bumps or silently falls back to a patch bump.
  - Enforced locally by a `commit-msg` hook; enable it once per clone with
    `git config core.hooksPath .githooks`. Also checked in CI on every PR: the `commitlint` job
    lints individual commits (via `@commitlint/config-conventional`, same rules), and
    `pr-title-lint` lints the PR title itself (via `amannn/action-semantic-pull-request`, same
    rules through its `subjectPattern`) — needed because a squash merge (this repo's
    title-as-commit-message default) uses the title, not the underlying commits, as what actually
    lands on `release`. Any of the three catches a bypassed local hook (`--no-verify`).
- Keep PRs focused on one change; incidental fixes found along the way are welcome as separate
  small commits but call them out in the PR description.
- Database schema changes go in a new Flyway migration under
  `backend/src/main/resources/db-migration/` (see [AGENTS.md](AGENTS.md#creating-a-new-database-migration)).

## Dependency updates

Dependabot manages routine dependency bumps. If you update `gradle/libs.versions.toml` by hand,
regenerate the verification metadata (see
[README.md](README.md#dependency-verification)):

```bash
./gradlew --write-verification-metadata sha256 --refresh-dependencies
```

## CI

Every PR runs build, test, lint, a Docker image build, and E2E tests (see
[README.md](README.md#cicd) for the full pipeline table). SonarCloud reports code quality and
coverage on the PR.

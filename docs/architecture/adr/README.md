# Architecture Decision Records

An ADR records one architectural decision: what was decided, the situation that forced the choice,
what it costs, and which alternatives lost and why. It is written once and then left alone — if a
decision changes, a new ADR supersedes the old one rather than rewriting it. That is what makes the
set readable as the reasoning behind the system, not just a description of it.

The records here document decisions that were **already in effect** when they were written; they were
reconstructed from the code, the module READMEs and the issue history
([#3114](https://github.com/wrk-tafel/admin/issues/3114)). The **Recorded** date on each is the date
it was written down, not the date the decision was made.

Numbers are assigned in the order records are written; the index below groups them by subject
instead, so a number's position in a group says nothing about its age.

## Index

### Platform and structure

| # | Decision | Status |
|---|---|---|
| [0015](0015-kotlin-spring-boot-backend-angular-frontend.md) | Kotlin/Spring Boot backend, Angular frontend | accepted |
| [0001](0001-modular-monolith-with-spring-modulith.md) | Modular monolith with Spring Modulith | accepted |
| [0002](0002-single-deployable-image-with-independent-builds.md) | One deployable image, two independent builds | accepted |
| [0003](0003-postgresql-as-the-only-infrastructure-dependency.md) | PostgreSQL is the only infrastructure dependency | accepted |
| [0010](0010-zoneless-standalone-angular-with-signals.md) | Zoneless, standalone Angular with signal-based state | accepted |
| [0029](0029-installable-pwa-with-an-explicit-update-prompt.md) | Installable PWA with an explicit update prompt | accepted |
| [0027](0027-single-locale-and-timezone.md) | One locale and one timezone, fixed at the image level | accepted |

### Data and persistence

| # | Decision | Status |
|---|---|---|
| [0004](0004-repeatable-only-flyway-migrations.md) | Repeatable-only Flyway migrations, never edited once released | accepted |
| [0007](0007-household-person-model-with-customer-vocabulary-in-the-frontend.md) | Household/person model, "customer" vocabulary in the frontend | accepted |
| [0020](0020-reports-are-frozen-snapshots.md) | Reports and statistics are frozen snapshots, never live joins | accepted |
| [0021](0021-documents-on-a-volume-metadata-in-the-database.md) | Documents on a mounted volume, metadata in the database | accepted |
| [0025](0025-single-free-text-fuzzy-search.md) | One free-text search box over a trigger-maintained column | accepted |
| [0048](0048-static-values-resolved-from-a-per-run-snapshot.md) | Static values resolved from a per-run snapshot instead of a cache | accepted |

### Interfaces and communication

| # | Decision | Status |
|---|---|---|
| [0008](0008-rest-api-and-dto-naming-conventions.md) | REST conventions and Request/Response/Item DTO naming | accepted |
| [0005](0005-server-sent-events-with-a-transactional-outbox.md) | Real-time updates via SSE fed by a transactional outbox | accepted |
| [0041](0041-mails-sent-through-an-outbox.md) | Mails queued in the database and sent by a poller | accepted |
| [0045](0045-one-mail-per-transaction-taken-with-skip-locked.md) | One mail per transaction, taken with `FOR UPDATE SKIP LOCKED` | accepted |
| [0046](0046-a-mail-given-up-on-is-kept-for-a-window-not-forever.md) | A mail given up on is kept for a window, not forever | accepted |
| [0047](0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md) | Scheduled jobs coordinate on their own rows first, ShedLock second | accepted |
| [0017](0017-web-push-as-a-second-notification-channel.md) | Web Push (VAPID) as a second, out-of-app channel | accepted |
| [0006](0006-stateless-jwt-cookie-authentication.md) | Stateless JWT-in-cookie auth with fine-grained permissions | accepted |
| [0050](0050-customer-documents-split-into-its-own-permission.md) | The documents tab gets its own permission, separate from CUSTOMER | accepted |
| [0051](0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md) | Data-subject requests search across areas, then delegate to each area's own export/delete | accepted |
| [0034](0034-error-contract-problemdetail-to-german-toast.md) | One error contract — RFC 7807 out, a German toast in | accepted |
| [0009](0009-server-side-document-generation-with-xsl-fo.md) | Server-side documents — XSL-FO/FOP for PDF, Commons CSV | accepted |
| [0040](0040-route-navigation-by-map-app-deep-link.md) | Navigation along a route is a deep link into the device's map app | accepted |

### Domain rules

| # | Decision | Status |
|---|---|---|
| [0016](0016-distribution-lifecycle-model.md) | Distribution lifecycle — implicit state, non-blocking locks, two-stage close | accepted |
| [0032](0032-checkin-relays-scans-without-interpreting-them.md) | Check-in relays scan results without interpreting them | accepted |
| [0023](0023-ticket-numbers-come-from-the-caller.md) | Ticket numbers come from the caller; backend enforces uniqueness | accepted |
| [0024](0024-server-side-income-validation.md) | Income validation re-runs server-side, with supervisor override | accepted |
| [0049](0049-the-above-limit-list-is-computed-live-not-materialized.md) | The above-limit list is computed from live data, never materialized | accepted |
| [0022](0022-duplicate-detection-and-merge-by-side.md) | Fuzzy duplicate detection; merges resolved by side | accepted |

### Operations, build and delivery

| # | Decision | Status |
|---|---|---|
| [0011](0011-configuration-hot-reload-instead-of-restarts.md) | Configuration reloaded on a running instance | accepted |
| [0018](0018-optional-features-behind-a-kill-switch.md) | Optional per-deployment features gated by one availability rule | accepted |
| [0012](0012-conventional-commits-drive-releases.md) | Conventional Commits drive the release version | accepted |
| [0043](0043-every-environment-deploys-automatically.md) | Every environment deploys automatically, dev from all three pipelines | accepted |
| [0042](0042-deployments-through-github-environments.md) | Deploys run in GitHub environments, with an on-demand deploy beside the automatic one | superseded by [0043](0043-every-environment-deploys-automatically.md) |
| [0026](0026-branch-based-promotion-through-environments.md) | Branch-based promotion through dev, test and prod | superseded by [0042](0042-deployments-through-github-environments.md) |
| [0013](0013-saturday-production-deploy-freeze.md) | Production deploys blocked all day Saturday | accepted |
| [0019](0019-supply-chain-and-container-runtime-hardening.md) | Pinned supply chain and a container that fails loudly | accepted |
| [0035](0035-first-run-bootstraps-an-administrator-account.md) | A first run against an empty database bootstraps one administrator | accepted |
| [0014](0014-integration-tests-against-real-postgres.md) | Integration tests against real PostgreSQL via Testcontainers | accepted |
| [0030](0030-conventions-enforced-by-archunit.md) | Structural conventions enforced by ArchUnit tests | accepted |
| [0031](0031-sonarcloud-quality-gate-with-explicit-coverage-opt-out.md) | SonarCloud quality gate with an explicit coverage opt-out | accepted |
| [0036](0036-page-performance-index-in-the-pipeline.md) | Page performance rated by Lighthouse, with thresholds that fail the build | accepted |
| [0037](0037-eager-bundle-bounded-by-its-own-build-check.md) | The eager bundle bounded by a build check of its own | accepted |
| [0038](0038-axe-assertions-in-the-e2e-suite.md) | Post-interaction accessibility asserted by axe inside the e2e suite | accepted |
| [0039](0039-audit-trail-as-an-append-only-log-written-by-the-application.md) | Audit trail as one append-only `audit_log` table, written by the application | accepted |
| [0052](0052-change-tracking-actor-becomes-a-foreign-key.md) | `created_by`/`updated_by` become a foreign key to `users`, not a stored username | accepted |
| [0044](0044-support-requests-sent-as-mail.md) | In-app support requests sent as mail, with the browser's context attached | accepted |
| [0053](0053-client-side-errors-logged-automatically-to-app-log.md) | Client-side errors are logged automatically to `app.log` | accepted |
| [0033](0033-support-requests-become-github-issues.md) | In-app support requests are filed as GitHub issues | superseded by [0044](0044-support-requests-sent-as-mail.md) |
| [0028](0028-user-guide-in-repo-published-per-release.md) | User guide in the repository, published as a PDF per release | accepted |

## Analyses

Longer evaluations of a decision that has **not** been taken are not ADRs — nothing in them is
decided. They live one level up, in `docs/architecture/`:

| Document | Subject |
|---|---|
| [`gdpr-compliance.md`](../gdpr-compliance.md) | What the application does with personal data, and where that falls short of the GDPR ([#3124](https://github.com/wrk-tafel/admin/issues/3124)) |
| [`rls-postgres-evaluation.md`](../rls-postgres-evaluation.md) | Whether Postgres Row Level Security makes sense given this application's single-tenant, permission-not-row access model ([#3411](https://github.com/wrk-tafel/admin/issues/3411)) |

## Reference

Unlike an ADR or an analysis, this is a living inventory of current state, kept in sync as the
codebase changes rather than written once and left alone:

| Document | Subject |
|---|---|
| [`scheduled-jobs.md`](../../scheduled-jobs.md) | Every `@Scheduled` job's schedule and coordination mechanism (row-claim vs. `@SchedulerLock`, see [ADR-0047](0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md)) |

## Writing a new one

Copy [`template.md`](template.md), take the next free number, and name the file
`NNNN-short-kebab-title.md`. Then add a row to the index above.

Guidelines that keep this set useful:

- **One decision per record.** If the title needs an "and", it is probably two ADRs.
- **Write down the cost.** An ADR that only lists benefits is marketing; the consequences section is
  the part future readers actually need.
- **Only real alternatives.** An option nobody seriously considered does not belong in "Alternatives
  considered".
- **Point at code.** File paths and issue numbers let a reader check the record against reality —
  and notice when it has gone stale.
- **Don't edit an accepted record to reflect a new decision.** Add a new ADR, mark the old one
  `superseded by ADR-NNNN`, and link both ways.

Statuses in use: `accepted`, `superseded by ADR-NNNN`, `deprecated`.
</content>

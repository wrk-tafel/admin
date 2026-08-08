# Architecture Decision Records

An ADR records one architectural decision: what was decided, the situation that forced the choice,
what it costs, and which alternatives lost and why. It is written once and then left alone — if a
decision changes, a new ADR supersedes the old one rather than rewriting it. That is what makes the
set readable as the reasoning behind the system, not just a description of it.

The records here document decisions that were **already in effect** when they were written; they were
reconstructed from the code, the module READMEs and the issue history
([#3114](https://github.com/wrk-tafel/admin/issues/3114)). The **Recorded** date on each is the date
it was written down, not the date the decision was made.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-modular-monolith-with-spring-modulith.md) | Modular monolith with Spring Modulith | accepted |
| [0002](0002-single-deployable-image-with-independent-builds.md) | One deployable image, two independent builds | accepted |
| [0003](0003-postgresql-as-the-only-infrastructure-dependency.md) | PostgreSQL is the only infrastructure dependency | accepted |
| [0004](0004-repeatable-only-flyway-migrations.md) | Repeatable-only Flyway migrations, never edited once released | accepted |
| [0005](0005-server-sent-events-with-a-transactional-outbox.md) | Real-time updates via SSE fed by a transactional outbox | accepted |
| [0006](0006-stateless-jwt-cookie-authentication.md) | Stateless JWT-in-cookie auth with fine-grained permissions | accepted |
| [0007](0007-household-person-model-with-customer-vocabulary-in-the-frontend.md) | Household/person model, "customer" vocabulary in the frontend | accepted |
| [0008](0008-rest-api-and-dto-naming-conventions.md) | REST conventions and Request/Response/Item DTO naming | accepted |
| [0009](0009-server-side-document-generation-with-xsl-fo.md) | Server-side documents — XSL-FO/FOP for PDF, Commons CSV | accepted |
| [0010](0010-zoneless-standalone-angular-with-signals.md) | Zoneless, standalone Angular with signal-based state | accepted |
| [0011](0011-configuration-hot-reload-instead-of-restarts.md) | Configuration reloaded on a running instance | accepted |
| [0012](0012-conventional-commits-drive-releases.md) | Conventional Commits drive the release version | accepted |
| [0013](0013-saturday-production-deploy-freeze.md) | Production deploys blocked all day Saturday | accepted |
| [0014](0014-integration-tests-against-real-postgres.md) | Integration tests against real PostgreSQL via Testcontainers | accepted |

## Related decision documents

Not every architecture document is an ADR. Longer evaluations that weigh options for a decision not
yet taken live one level up, in [`docs/architecture/`](../):

| Document | Subject |
|---|---|
| [Audit trail](../audit-trail.md) | Whether to keep `created_at`/`updated_at` and what a real audit trail should look like ([#2871](https://github.com/wrk-tafel/admin/issues/2871)) |

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

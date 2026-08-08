# ADR-0003: PostgreSQL is the only infrastructure dependency

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Several requirements in this system are the textbook motivation for a dedicated piece of
infrastructure:

- mutual exclusion across requests and (potentially) instances — "two admins both press *Ausgabe
  starten*"
- pushing state changes to open browser sessions in real time
- typo-tolerant search over customer records
- caching values that are read constantly and written rarely

The counterweight is the operating environment: one small host per environment, one container,
volunteer maintainers, no on-call rotation. Every additional server is one more thing to install,
back up, monitor, patch and debug during a live Saturday distribution — and one more way for the
application to be down while the database is perfectly healthy.

## Decision

**PostgreSQL is the only external system the application requires** (an SMTP server for outgoing
mail aside). Each of the needs above is met with a Postgres feature rather than a new component:

| Need | Mechanism |
|---|---|
| Mutual exclusion | Transaction-level **advisory locks** (`pg_advisory_xact_lock` / `pg_try_advisory_xact_lock`), keyed by the `AdvisoryLockKey` enum |
| Real-time push | `sse_outbox` table + **`LISTEN`/`NOTIFY`**, forwarded to SSE emitters — see [ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md) |
| Fuzzy search | **`pg_trgm`** (`strict_word_similarity`, GIN-indexed) over a trigger-maintained `search_text` column |
| Duplicate detection | **`fuzzystrmatch`** (`soundex`, `levenshtein`) in one hand-written SQL query |
| Caching | In-process `ConcurrentMapCacheManager`, evicted by the writing service |
| Scheduling | Spring's `@Scheduled` in the same process (outbox cleanup, stale login attempts) |

`docker-compose.yml` for local development therefore starts PostgreSQL, pgAdmin and Mailpit — no
broker, no cache server, no search engine.

## Consequences

- One thing to install, back up and restore. A consistent database backup is a consistent backup of
  the queue, the locks, the search index and the notification state, because they are all in it.
- Two extensions are hard requirements: `pg_trgm` and `fuzzystrmatch`. The latter lives in
  `postgresql-contrib`, which is why the image's CDS-training stage installs it explicitly. A
  Postgres without them fails at migration time, not later.
- The cache is per process and unreplicated. Correct today (one instance) and it fails loudly rather
  than subtly if that ever changes — but it *is* an assumption of single-instance deployment, as is
  every in-process `@Scheduled` job.
- Advisory locks are transaction-scoped and released only by commit/rollback, so the enclosing
  transaction's runtime *is* the lock hold time. Lock late, keep the transaction short, and do slow
  work (mail, push fan-out) outside the locked block or on an async listener.
- Lock ids are a flat global namespace (`AdvisoryLockKey`, spaced 1000 apart). Reusing a value for
  two unrelated operations silently serializes them.
- Postgres does these jobs adequately, not excellently. The moment throughput genuinely outgrows
  `LISTEN`/`NOTIFY` or trigram search, the answer is to revisit this ADR rather than to tune around
  it.

## Alternatives considered

**Redis for caching, locks and pub/sub.** The natural fit for three of the four needs at once, and
rejected for exactly that reason: it would become a second stateful component that the application
cannot start without, for workloads measured in single-digit events per second.

**A message broker (RabbitMQ/Kafka) for the real-time and post-distribution work.** Rejected: the
delivery guarantees needed here are already obtainable from a table written in the same transaction
as the change it describes (ADR-0005), and a broker adds a durability story of its own to operate.

**Elasticsearch or an external search service.** Rejected: the searchable corpus is a few thousand
households; `pg_trgm` over a denormalized column answers it in one query against data that is never
stale, with no index to reindex or keep in sync.

**Distributed locks in the application layer.** Rejected: the database is already the serialization
point every writer goes through, and it releases locks on crash for free.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/lock/` (`AdvisoryLockKey`,
  `AdvisoryLockService`, README)
- `backend/src/main/resources/db-migration/R__00088_fulltext_search.sql` (`pg_trgm`, `search_text`
  triggers), `R__00031_duplication_detection.sql` (`fuzzystrmatch`)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/CacheConfig.kt`
- `docker-compose.yml`, `_build/Dockerfile`
</content>

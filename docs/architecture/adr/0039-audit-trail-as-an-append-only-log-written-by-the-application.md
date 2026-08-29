# ADR-0039: Audit trail as one append-only `audit_log` table, written by the application

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Two questions were on the table
([#2871](https://github.com/wrk-tafel/admin/issues/2871)): whether the per-table
`created_at`/`updated_at` columns should be kept, and whether a real audit feature was worth
building. The columns turned out to be domain data — the "Ausgestellt am" date on the customer PDFs,
the timestamp beside a household note, the "Neu"/"Verlängert" overview lists and the customer
search's tie-break ordering all read them — so they stay. The second question is what this record
decides.

There was effectively no audit trail. Four concrete gaps:

- **No actor.** Nothing recorded who changed anything. The actor-shaped columns that exist are
  business relations with their own meanings: `households.employee_id` is stamped once at creation
  and never touched again, `locked_by`/`uploaded_by_user_id`/`household_notes.employee_id` each
  describe one specific act. For editing a household's income, address or lock state — the most
  sensitive operation in the system — the question "who did this" had no answer.
- **No history.** One row holds current state. `updated_at` says *that* something changed, never
  what.
- **Deletes erase everything.** `HouseholdService.deleteHouseholdByHouseholdId` hard-deletes, and
  `HouseholdMergeService` deletes every source household after re-parenting its children — after a
  merge, the sources' former field values existed only in `app.log`.
- **A mutable column is a lossy event log.** `households.prolonged_at` can answer "when was this
  last prolonged", never "how often" or "when before that".

Two constraints shaped the answer. Flyway owns the schema — `ddl-auto` is unset, so Hibernate
generates nothing and every table is hand-written as a repeatable migration. And the acting user is
known only to the application: a database session knows the connection pool's credentials, not who
is behind the request.

## Decision

**One append-only table, `audit_log`, written from Hibernate's flush-time events by the application.**

- The table (`R__00093_audit_log.sql`) holds when, who (`actor_user_id`/`actor_username` plus the
  acting employee's `actor_firstname`/`actor_lastname`, all denormalized with no foreign key so the
  row survives the account being renamed, relinked or deleted), what
  (`entity_type`, `entity_id`, and a `business_key` that stays meaningful once the referenced row is
  gone), the kind of change, and a `jsonb` `changed_fields` document of the shape
  `{"addressCity": ["Wien", "Graz"]}`.
- `AuditEventListener` (`database/common/audit/`) turns Hibernate's post-insert/update/delete events
  into entries; `AuditLogWriter` buffers them per transaction and writes them in `beforeCommit`, so a
  rolled-back transaction records nothing and the actor is resolved once rather than per row.
  `AuditFieldDiff` computes the diff over Hibernate's plain state arrays, with no session in the way,
  so it can be tested without a database.
- `AuditScope` is an explicit allow-list: households, persons, household notes, documents, users,
  user authorities, static values and mail recipients. `distributions_households` and the statistics
  tables are excluded — they are event records already and carry by far the highest write volume —
  as are `login_attempts` and `sse_outbox`, which are purpose-built infrastructure with their own
  retention.
- **The bulk write paths log explicitly.** `@Modifying` queries never reach a Hibernate event, so
  `HouseholdMergeService` calls `AuditLogWriter.record` for the re-parenting it performs.
- **`created_by`/`updated_by` are added to every change-tracked table** (`R__00092`), filled by
  Spring Data JPA auditing (`JpaAuditingConfig`) from the same `AuditActorProvider` the log uses. They
  answer "who last touched this row" without a join; the log answers everything else.
- **Reading it is its own Spring Modulith module**, `modules/audit`, behind a new `AUDIT_LOG`
  permission: a household's history on the customer detail screen's "Verlauf" tab, and the whole log
  on the `/zugriffsprotokoll` administration screen. There is no endpoint that writes, edits or
  deletes an entry.
- **Entries expire.** `AuditRetentionService` removes entries older than
  `tafeladmin.audit.retentionDays` (default 30) daily at 05:00
  (`tafeladmin.audit.cleanupCron`). Deleting a household does *not* purge its
  entries early — the DELETE entry with the last known values is the thing the old schema lost on
  every merge, and dropping it on request would defeat the point of recording it.

## Consequences

- "Who changed what, and what did it look like before" is answerable for the first time, in plain
  SQL during a support call as well as in the UI.
- **The diffing and the allow-list are ours to keep correct.** A new field on an audited entity is
  picked up automatically (the diff walks Hibernate's property list), but a new *entity* is not
  audited until it is added to `AuditScope` — and adding one that is written thousands of times per
  distribution day would be a mistake nothing catches.
- **Bulk writes remain a hole that has to be filled by hand.** Today that is
  `HouseholdMergeService`; any future `@Modifying` query or native SQL against an audited table has
  to call `AuditLogWriter.record` itself, and nothing fails if it doesn't.
- **The listener must never throw.** An exception raised inside a flush listener aborts the business
  transaction, so every callback is wrapped — failing to record a change is bad, refusing to save a
  household because recording failed is worse.
- `beforeCommit` has to flush the persistence context itself before draining its buffer, because it
  runs *before* Hibernate's own commit-time flush. Without that, an entity modified but not yet
  written would raise its event too late and its change would be lost.
- **The log holds personal data with a retention clock on it.** Names, addresses and income figures
  of people whose household may since have been deleted are kept for 30 days. Bounding the window by
  what the trail is actually used for - questioning a recent change - is the cheaper answer to the
  DSGVO question than pseudonymisation would have been, and it is why the window is configuration
  rather than a constant. The cost is that a question asked two months later can no longer be
  answered.
- Password values are never written, only the fact that the field changed (`AuditScope`'s
  `redactedFields`). The stored value is an Argon2 hash, but an audit trail is read by more people and
  kept longer than the `users` table.
- Every write now costs one extra insert per changed row within the same transaction. Excluding the
  distribution tables is what keeps that off the hot path of a distribution day.
- **`AUDIT_LOG` alone is not enough to read a household-scoped entry's field values.** The log
  spanning users and settings too is why `AUDIT_LOG` was kept separate from `CUSTOMER` in the first
  place, but that separation originally extended to the values themselves - an `AUDIT_LOG`-only
  account could read every household's names, addresses and income out of `changed_fields`. Fixed by
  requiring `CUSTOMER` as well: outright on the per-household "Verlauf" endpoint
  (`AuditController.getHouseholdHistory`), and by redacting `changes` to an empty list on the mixed
  `search`/`filter-options` screen (`AuditService.isRedactedForCaller`) rather than hiding the whole
  entry - *that* a household/person/note/document changed, by whom and when, still needs no more than
  `AUDIT_LOG` to see.

## Alternatives considered

**Actor columns only (Spring Data JPA auditing, on its own).** `@CreatedBy`/`@LastModifiedBy` plus
two columns per table closes the "who" gap for the latest change at almost no cost — but leaves no
history and nothing surviving a delete. Not rejected so much as absorbed: it is step one of this
decision, and it proved out the `AuditorAware` wiring the log reuses.

**Hibernate Envers.** Version-managed by the Hibernate platform already on the classpath, and strong
where this design is weak: entity-graph fidelity, `REVTYPE=DEL` rows, no diffing code of our own. It
lost on the schema. With Flyway owning DDL, every `_AUD` mirror table would be hand-written (~24 up
front), and from then on every new column on an audited table would need a matching `_AUD` column in
the same migration, with nothing enforcing it — a missed column surfaces at runtime, on a write, in
production. Reading it is also not plain SQL, and it would double the write volume on
`distributions_households` for no benefit. Under a different constraint set ("all entities, fully
versioned") it would win.

**Postgres triggers writing to the same table.** This repo already uses row-level triggers for
`search_text` (`R__00088_fulltext_search.sql`), and for the very reason that would apply here: they
catch *every* write path, including the bulk updates this design misses. Rejected because of the
actor. The database session does not know which user is behind a transaction, so it would have to be
pushed down per transaction via `set_config('tafel.actor', …)` from every write path — and a path
that forgets it logs an anonymous change, which is worse than not logging it. The known, bounded gap
of "bulk queries log explicitly" was preferred to a silent one.

**Status quo.** Zero cost, and none of the four gaps closes on its own.

## References

- [#2871](https://github.com/wrk-tafel/admin/issues/2871) — the originating issue
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/audit/` — listener, writer,
  scope, diff, retention
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/audit/` — the read API and its README
- `backend/src/main/resources/db-migration/R__00092_change_tracking_actor.sql`,
  `R__00093_audit_log.sql`
- [ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md) — the other place this codebase
  writes a row inside the business transaction rather than acting outside it

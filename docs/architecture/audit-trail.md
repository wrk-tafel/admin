# Audit trail — evaluation

Evaluation for [issue #2871](https://github.com/wrk-tafel/admin/issues/2871). This is a decision
document, not a description of shipped behaviour: nothing here is implemented yet.

The ticket asks two things:

1. Should the per-table `created_at` / `updated_at` columns be kept or removed?
2. Is a proper generic audit feature (separate table?) worth building instead?

**Short answers:** keep the columns — they are domain data that several user-visible features read,
not an audit trail that could be swapped out. And yes, a generic audit trail is worth building,
because today there is effectively none: nothing records *who* changed anything, no previous value
is retained, and every delete path erases the record without trace. The recommended shape is a
single append-only `audit_log` table with a `jsonb` field diff, written from the application, not
Hibernate Envers and not database triggers. Reasoning below.

## 1. What `created_at` / `updated_at` are today

`BaseChangeTrackingEntity` (`backend/.../database/model/base/BaseChangeTrackingEntity.kt`) adds
exactly two columns, filled by Hibernate's `@CreationTimestamp` / `@UpdateTimestamp`:

```kotlin
@Column(name = "created_at") @CreationTimestamp open var createdAt: LocalDateTime? = null
@Column(name = "updated_at") @UpdateTimestamp  open var updatedAt: LocalDateTime? = null
```

There is **no actor column** on the base class.

24 of the 28 entities extend it. The four that do not are `MailRecipientEntity`,
`ScannerRegistrationEntity`, `CountryEntity` and `StaticValueEntity` — all of them either static
master data or short-lived rows.

### These columns are read as domain data

Not as an audit log. Every one of these consumers would need the value re-introduced under a
different name if the columns were dropped:

| Consumer | Reads | Surfaces as |
|---|---|---|
| `HouseholdPdfService.kt:54` | `households.created_at` | "Ausgestellt am" on the master-data PDF and the ID card |
| `HouseholdConverter.kt:145` | `households.created_at` | `issuedAt` on the customer API response |
| `HouseholdService.kt:273` | `findAllByCreatedAtBetween` | the "Neu" list of `GET /households/overview` |
| `HouseholdService.kt:276` | `findAllByProlongedAtBetween` | the "Verlängert" list of the same endpoint |
| `HouseholdNoteService.kt:44` | `household_notes.created_at` | timestamp next to each note |
| `HouseholdDocumentService.kt:192` | `household_documents.created_at` | `uploadedAt` in the documents tab |
| `PushSubscriptionService.kt:155` | `push_subscriptions.created_at` | registration time in the device list |
| `HouseholdEntity.kt:192` | `households.updated_at` | tie-break ordering of the customer search (`updated_at desc`) |

`DistributionService.kt:467` even assigns both fields by hand when copying household data into a
distribution row — a fair indicator that they are treated as ordinary columns rather than as
infrastructure.

**Conclusion on question 1: keep them.** They are cheap, they carry no actor and therefore no
privacy weight of their own, and a generic audit table would not replace a single one of the uses
above. A future audit trail sits *next to* them, not in place of them.

## 2. What they are not

The ticket's premise — "audit is currently done (more or less) via created_at and modified_at" — is
worth restating precisely: there is no audit today. There is per-row bookkeeping that two features
happen to read. Four concrete gaps:

**No actor.** Nothing records who performed a change. The actor-ish columns that exist are business
relations with their own distinct meanings, not change tracking:

- `households.employee_id` (`issuer`) is stamped once and then never touched again —
  `HouseholdConverter.kt:50` reads `householdEntity.issuer ?: userEntity!!.employee`, so it means
  "who created this household", never "who last edited it".
- `households.locked_by`, `household_documents.uploaded_by_user_id` and
  `household_notes.employee_id` each describe one specific business act.

So for the single most sensitive operation in the system — editing a household's income, address or
lock state — the system cannot answer "who did this".

**No history.** One row holds current state only. An address corrected five times leaves one
timestamp and one address. `updated_at` says *that* something changed, never *what*.

**Deletes erase everything.** Physical deletes are used throughout, and they take the timestamps
with them:

- `HouseholdService.kt:327` hard-deletes a household, and `HouseholdMergeService.kt:127` deletes
  every source household of a merge after re-parenting its children. After a merge, the sources'
  former field values exist only in `app.log`.
- `HouseholdConverter.kt:123` does `persons.clear(); persons.addAll(...)` against an
  `orphanRemoval = true` collection — a person left out of an update payload is deleted outright.
- `HouseholdMergeService.kt:103` drops colliding `distributions_households` rows.
- `SettingsService.kt:83` replaces the mail recipients with `deleteAll()` + `saveAll()`, so every
  save of that screen looks like a fresh create with no predecessor.

**A mutable column is a lossy event log.** `households.prolonged_at` is the clearest example: it is
set to "now" when an update pushes `validUntil` further out, and each prolongation overwrites the
previous one. The column can answer "when was this household last prolonged", never "how often" or
"when before that" — and it says nothing about who did it. That is the structural weakness of
encoding a repeating event in a single mutable column, and an append-only log is exactly what fixes
it.

**Conclusion on question 2: yes, a real audit trail is worth building** — the gap is "who changed
what, and what did it look like before", and nothing in the current schema addresses it.

## 3. Options considered

### A — Status quo

Zero cost, and it keeps working for the two reporting features. Rejected as an answer to the ticket:
none of the four gaps above closes on its own.

### B — Actor columns only (Spring Data JPA auditing)

`@EnableJpaAuditing` + an `AuditorAware` reading the `SecurityContextHolder`, then `@CreatedBy` /
`@LastModifiedBy` on `BaseChangeTrackingEntity` and two nullable columns per table.

- Closes the "who" gap for the *latest* change on every audited table, at the cost of one migration
  and a base-class change.
- Still no history, and still nothing survives a delete.

Not sufficient on its own, but it is a strict improvement and a sensible first step (see the
recommendation).

### C — Hibernate Envers

`org.hibernate.orm:hibernate-envers` is version-managed by the Hibernate platform already on the
classpath (`hibernate-core 7.4.1`). `@Audited` per entity produces one `<table>_AUD` mirror table
per audited table plus a global `REVINFO`; a `@RevisionEntity` with a `RevisionListener` supplies
the acting user; `ValidityAuditStrategy` adds a `REVEND` column so "state at time X" queries do not
have to scan.

Where it fits badly *here*:

- **Flyway owns the schema.** `ddl-auto` is unset and Flyway is on the classpath, so Hibernate
  generates nothing. Every `_AUD` table would have to be hand-written as a repeatable migration
  (~24 mirror tables up front), and from then on **every** new column on an audited table needs a
  matching `_AUD` column in the same migration. Nothing enforces that: a missed column surfaces at
  runtime, on a write, in production. Given the repeatable-migration rules this repo already lives
  with (never edit a released migration), that is a permanent tax with a sharp edge.
- **Reading it is not plain SQL.** Surfacing a "Verlauf" tab means `AuditReader` or an extra
  `spring-data-envers` dependency, and the on-disk layout (`REV`/`REVTYPE`/`REVEND`) is awkward for
  ad-hoc queries during a support call.
- **It doubles the write volume** on the busiest table, `distributions_households` (one row per
  household per distribution), for no benefit — that table is an event record already.

What it does well: entity-graph fidelity, `REVTYPE=DEL` rows so merges and deletions stay visible,
and no diffing code of our own. If the audit scope were "all entities, fully versioned", this would
be the right answer despite the schema tax.

### D — Append-only `audit_log` table with a `jsonb` diff (recommended)

One table, written from a Hibernate/Spring event listener at flush time:

| column | purpose |
|---|---|
| `occurred_at` | when |
| `actor_user_id`, `actor_username` | who — username denormalized so the row stays readable even if the user record changes |
| `entity_type`, `entity_id`, `business_key` | what (`business_key` holding e.g. the `household_id`, so the row is still meaningful after the entity row is gone) |
| `operation` | `INSERT` / `UPDATE` / `DELETE` |
| `changed_fields` (`jsonb`) | `{"addressCity": ["Wien", "Graz"], ...}` — only the fields that actually changed |

- One migration, one index set, one thing to reason about; readable with plain SQL during support.
- Survives deletes by construction — a `DELETE` row keeps the last known values and the business
  key, which is exactly what the merge and household-delete paths currently lose.
- A "Verlauf" tab or an admin log screen is a straightforward paged query against one table.
- The actor is already available at every write path via the `SecurityContext` (the pattern
  `HouseholdConverter.kt:41` and `HouseholdDocumentService` already use).

Costs, stated honestly:

- The diffing and the entity/field allow-list are ours to write, test and keep correct.
- **Bulk updates bypass Hibernate listeners.** `HouseholdMergeService`'s `@Modifying` re-parenting
  queries and the trigger-maintained `search_text` column would not be seen; the merge would have to
  log its own audit entry explicitly. This is a known, boundable gap — but it is a real one, and it
  must be part of the implementation ticket rather than discovered later.

### E — Postgres triggers writing to a generic audit table

Row-level triggers computing `to_jsonb(new) - to_jsonb(old)` into the same table as D. The repo
already uses exactly this technique for `search_text` (`R__00088_fulltext_search.sql`), and for the
same stated reason: it catches *every* write path, including bulk updates, testdata loads and manual
fixes.

Rejected because of the actor: the database session does not know which user is behind a
transaction. It would have to be pushed down per transaction (`set_config('tafel.actor', …)`) from
the application, which couples every write path to a session variable that nothing enforces — and a
path that forgets it silently logs an anonymous change, which is worse than not logging it.

## 4. Recommendation

**Keep `created_at` / `updated_at` unchanged. Build option D, in two steps.**

1. **Actor columns first** (option B): `AuditorAware` + `@CreatedBy` / `@LastModifiedBy` on
   `BaseChangeTrackingEntity`, one migration. Small, independently useful, and it answers "who last
   touched this household" immediately — the question that actually comes up in practice. It also
   proves out the `AuditorAware` wiring that step 2 reuses.
2. **The `audit_log` table** with the listener, scoped deliberately narrowly at first (see below),
   plus explicit logging from the bulk paths that bypass the listener.

Envers (C) is the runner-up and would win under a different constraint set; the deciding factor is
that Flyway owns the schema, which turns "one mirror table per audited table" into a per-migration
obligation nothing checks.

## 5. Open decisions for the implementation ticket

These are product/ops decisions, not technical ones, and they should be settled before code is
written:

- **Scope.** Which entities are audited? Proposed starting set: `households`, `persons`,
  `household_notes`, `household_documents` (metadata only), `users` and `user_authorities`, plus the
  settings/static-value tables. Deliberately excluded: `distributions_households` (already an event
  record, and by far the highest write volume), `sse_outbox`, and `login_attempts` (its own
  purpose-built audit artifact with its own retention, `LoginAttemptService.kt:103`).
- **Retention and DSGVO.** The log will hold names, addresses and income figures of people whose
  household may later be deleted, which is precisely the data a deletion is meant to remove. Needs
  an explicit retention period, and a decision on whether deleting a household also purges its audit
  rows (defeating much of the point) or keeps them pseudonymized. Scheduled-retention precedent
  exists: `SseOutboxService.cleanupOutbox` (14 days) and `LoginAttemptService.cleanupStaleEntries`.
- **Field-level sensitivity.** Whether income figures and document filenames are logged with their
  values or only as "changed".
- **Access.** A new permission (ADMINISTRATION group) gating who may read the log.
- **UI surface.** A "Verlauf" tab on the customer detail screen, an admin-only global log screen, or
  both — this also decides whether the user guide gains a chapter.
- **Volume.** Rows per distribution day drive the retention window; worth a rough measurement
  against production numbers before fixing a period.

## 6. Related finding

A defect found during this evaluation — a household prolonged and then edited again within the same
distribution window dropped out of the "Verlängert" list, because any update that did not prolong
reset `prolonged_at` to `null` — was filed as
[#3112](https://github.com/wrk-tafel/admin/issues/3112) rather than fixed here, and has since been
fixed: the column is now only ever set, never cleared. The argument in section 2 is unaffected — one
mutable column still keeps only the most recent prolongation.

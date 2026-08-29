# ADR-0052: `created_by`/`updated_by` become a foreign key to `users`, not a stored username

**Status:** accepted · **Recorded:** 2026-08-27

## Context

[ADR-0039](0039-audit-trail-as-an-append-only-log-written-by-the-application.md) added
`created_by`/`updated_by` to every change-tracked table (`R__00092_change_tracking_actor.sql`),
filled by Spring Data JPA auditing from `AuditActorProvider`. They were deliberately plain
`varchar` columns holding the acting user's *username*, with no foreign key to `users(id)` - the
migration's own comment reasoned that the value had to stay readable after that account was
renamed or deleted, and "an audit value that can be cascaded away is worthless".

That reasoning turned out to be backwards for these two columns specifically. They answer only "who
last touched this row right now" - the actual history lives in `audit_log`, which is unaffected by
this change and keeps the username forever regardless of what happens to the account. For
`created_by`/`updated_by`, "stays readable after the account is deleted" instead meant a deleted
staff member's username sat in the database forever on a table with no retention of its own
(`shops`, `cars`, `routes`, `distributions`, ...) - GDPR gap #3426. The fix considered first was a
bespoke `ChangeTrackingActorAnonymizationService` sweeping all 26 tables by hand on every account
deletion, replacing the username with a fixed placeholder - functionally correct, but a second
hand-maintained table list next to the one `R__00092`/`R__00096`/`R__00102` already needed, and one
more thing a future migration adding the columns to a new table could silently forget to extend.

## Decision

**`created_by`/`updated_by` are a nullable foreign key to `users(id)` with `on delete set null`,**
mirroring the pattern `R__00106_employee_delete_set_null.sql` already established for `employee_id`
references. Deleting an account clears every row it touched itself, at the database level, the same
moment the account row goes - there is nothing left for the application to sweep.

- `R__00111_change_tracking_actor_user_fk.sql` converts both columns, table by table, from
  `varchar` to `bigint`: backfilled from the current `users.username` match (a value that no longer
  matches anything becomes `NULL`, the correct end state anyway), then given the FK.
- `BaseChangeTrackingEntity.createdBy`/`updatedBy` change from `String?` to `Long?`.
- `JpaAuditingConfig`'s `AuditorAware<Long>` now needs the acting user's *id*, not username.
  Resolving it by querying `users` from inside `AuditActorProvider.currentUserId()` looked
  reasonable but broke: `AuditingEntityListener` calls it from inside Hibernate's persist cascade
  for the entity being audited, and issuing a query there can trigger an auto-flush of an only
  half-built object graph (a household saved together with its persons, mid-cascade) -
  `PersistentObjectException` on every household creation in practice. `TafelJwtAuthentication` now
  carries `userId` instead, populated once per request by `TafelJwtAuthProvider` from the
  `UserEntity` it already loads there for its own permission check - no extra query at all.
- `ChangeTrackingActorAnonymizationService` and its call from `TafelUserDetailsManager.deleteUser`
  are removed; `userRepository.delete(userEntity)` alone now does the whole job.

## Consequences

- One less hand-maintained mechanism: the table list only has to be kept in sync in the migration
  itself (as it already had to be for `R__00092`/`R__00096`/`R__00102`), not duplicated into a
  service class too.
- `created_by`/`updated_by` now follow a username *rename* correctly (resolved live through the FK
  whenever read via a join), where the old plain-text column froze whatever the username was at
  write time. This was never a stated goal, but falls out of the FK for free.
- Reading "who last touched this row" as a username now costs a join to `users`, where it used to be
  a bare column read - acceptable since nothing in the codebase reads these two columns today (they
  exist purely as change-tracking metadata); a future feature that wants to display it pays that
  join, and must already handle `NULL` the same way `R__00106`'s "Mitarbeiter gelöscht" pattern does
  for a deleted employee reference.
- `AuditorAware`'s id resolution is now coupled to `TafelJwtAuthentication` carrying it - a new
  authentication path that skips populating `userId` would silently audit as "no actor" instead of
  failing loudly. `AuditActorProviderTest` covers the fallback to a `TafelUser` principal for any
  other authentication type, but a path using neither gets `null`, same as no authentication at all.

## Alternatives considered

- **Keep the bespoke sweep (`ChangeTrackingActorAnonymizationService`), just fix the bug.** This is
  what issue #3426 originally shipped. Rejected on reflection: it is exactly the kind of logic a
  foreign key exists to make unnecessary, and it leaves a second table list to maintain by hand
  alongside the migration's own.
- **Resolve the auditor's user id by querying `users` per write**, matching how `AuditLogWriter`
  already resolves its own actor. Rejected - not equivalent: `AuditLogWriter` resolves once per
  transaction, from outside any entity's persist cascade (`writeBufferedEntries`, called after the
  buffered entries are collected). `AuditorAware` is invoked once per audited entity, from inside
  Hibernate's own persist/update callback for that entity, where a query can trigger an unsafe
  auto-flush - proven by `AuditTrailIT` failing exactly this way when tried.
- **Map `createdBy`/`updatedBy` as a full `@ManyToOne UserEntity` association** instead of a plain
  `Long`. Rejected as unnecessary weight across every one of the ~26 change-tracked tables for a
  value nothing currently reads; a raw id column still gets the real database-level foreign key and
  `on delete set null` cascade this ADR is about, without an eager (or accidentally N+1) join
  nothing asked for. Revisit if a feature actually wants to display the value.

## References

- `backend/src/main/resources/db-migration/R__00111_change_tracking_actor_user_fk.sql`
- `backend/src/main/resources/db-migration/R__00106_employee_delete_set_null.sql`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/model/base/BaseChangeTrackingEntity.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/config/JpaAuditingConfig.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/audit/AuditActorProvider.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/model/JwtAuthenticationModel.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/TafelJwtAuthProvider.kt`
- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/database/model/base/ChangeTrackingActorForeignKeyIT.kt`
- [ADR-0039](0039-audit-trail-as-an-append-only-log-written-by-the-application.md)
- `docs/architecture/gdpr-compliance.md` (G17)
- [#3426](https://github.com/wrk-tafel/admin/issues/3426)

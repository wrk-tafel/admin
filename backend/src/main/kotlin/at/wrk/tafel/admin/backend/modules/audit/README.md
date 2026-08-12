# Module: audit

Read access to the audit trail — "who changed what, and what did it look like before".

The decision behind it, including the options that lost, is ADR-0039
(`docs/architecture/adr/0039-audit-trail-as-an-append-only-log-written-by-the-application.md`).

## Why the writing side isn't in here

This module only reads. The listener that fills `audit_log` sits in `database/common/audit/`, next
to the entity it writes — the same place the SSE outbox lives, and for the same reason: it has to see
every module's writes. A Spring Modulith module cannot observe another module's persistence, and
making every module depend on this one so it could report its own changes is exactly the coupling
the listener exists to avoid.

## How a change becomes an entry

```
service saves an entity
   └─ Hibernate flush
        └─ AuditEventListener        post-insert / post-update / post-delete
             └─ AuditScope           is this entity audited? what is its business key?
             └─ AuditFieldDiff       {"addressCity": ["Wien", "Graz"]}
                  └─ AuditLogWriter  buffered on the transaction
                                      └─ beforeCommit → rows in audit_log
```

Three properties follow from writing in `beforeCommit` rather than as each change happens:

- **A rolled-back transaction records nothing.** `beforeCommit` never runs, so the log cannot claim
  a change the database does not hold.
- **The actor is resolved once**, from the `SecurityContext` of the thread that made the changes, not
  once per row — username, user id and the linked employee's name, all stamped onto the row so an
  entry keeps naming who made the change even after that account is renamed, relinked or deleted.
- **The buffer has to be completed first.** `beforeCommit` runs *before* Hibernate's own commit-time
  flush, so `AuditLogWriter` flushes the persistence context itself before draining — otherwise an
  entity modified but not yet written would raise its event too late and its change would be lost.
  That method is called `writeBufferedEntries`, not `flush`, because `TransactionSynchronization`
  declares a `flush()` of its own that an unqualified call would silently resolve to.

## What is audited

`AuditScope` is the single allow-list: households, persons, household notes, documents, users, user
authorities, static values and mail recipients. Adding an entity there is all it takes to audit it.

Deliberately left out, and worth leaving out:

- `distributions_households` and the distribution statistics tables — event records already (a row
  *is* the fact that something happened) and by far the highest write volume in the system, one row
  per household per distribution day.
- `login_attempts` and `sse_outbox` — purpose-built infrastructure with their own retention.

## The gap to know about

**Bulk `@Modifying` queries and native SQL never reach a Hibernate event.** Those callers have to
report what they did via `AuditLogWriter.record`, and nothing fails if they don't. Today that is
`HouseholdMergeService`, whose re-parenting of persons, notes and documents onto the merge target
happens entirely in bulk queries; it writes one entry per moved person, one summarising the merge on
the target, and one per source recording where its data went. The sources' own `DELETE` entries —
with their last field values — come from the listener.

Any new bulk write against an audited table has to do the same. This is the price of not using
database triggers, and the reason it was still the better trade is in ADR-0039.

## Values

Field values are recorded as they are, with one exception: `password` is logged as having changed but
never with a value. The stored value is an Argon2 hash, but an audit trail is read by more people and
kept longer than the `users` table.

Associations render as the referenced row's id rather than the object, collections are skipped
entirely (each child is an audited entity in its own right, or deliberately isn't), and
`created_at`/`updated_at`/`created_by`/`updated_by`/`search_text` are never diffed — they change on
every write and would bury every real field.

`business_key` is what keeps an entry meaningful after the row it describes is gone: the household
number for household-scoped entities, the username for user-scoped ones. It is what the "Verlauf" tab
queries, filtered by entity type as well, so a user account whose username happens to be a number
cannot turn up in a household's history.

## Retention

`AuditRetentionService` removes entries older than `tafeladmin.audit.retentionDays` (default 30)
every day at 05:00, and is the only thing that ever deletes one. The window is short on purpose: the
log holds names, addresses and income figures of people whose household may since have been deleted,
so it is bounded by what the trail is used for - questioning a recent change - rather than by how
long it might conceivably be interesting.

Deleting a household does **not** purge its entries early: the `DELETE` entry with the last known
values is precisely what the old schema lost on every merge.

Both that window and `tafeladmin.audit.enabled` are re-read per use, so an operator can widen the
window or switch recording off on a running deployment. The schedule itself
(`tafeladmin.audit.cleanupCron`) is the exception: `@Scheduled` fixes its expression when the bean is
created, so changing it needs a restart — which is why it is a plain placeholder in
`application.yml` rather than a field on `TafelAdminAuditProperties`.

## API

Everything is behind the `AUDIT_LOG` permission (ADMINISTRATION group), separate from `CUSTOMER`:
seeing a household's current data and seeing every change ever made to it are different levels of
access, and the log spans users and settings too.

| Endpoint | Serves |
|---|---|
| `GET /api/audit` | the administration screen — the whole log, newest first, optionally filtered by entity type, operation, actor, business key and date range |
| `GET /api/audit/filter-options` | what the filters offer: the entity types and operations, so adding an entity to `AuditScope` shows up in the UI without a frontend edit, plus the users the log holds entries for |
| `GET /api/audit/households/{householdId}` | the customer detail screen's "Verlauf" tab |

The household endpoint sits under `/api/audit` rather than under `/api/households/...` so the whole
feature stays behind one permission and one controller, and the household module keeps knowing
nothing about the audit trail.

The actor list comes from the log itself rather than from `users`, because the filter matches
`actor_username`: an account that never changed anything would be an option that can only return
nothing, and one since deleted still has to be offered for as long as its entries are here.

There is no endpoint that writes, edits or deletes an entry, and adding one would make the trail
worth less than not having it.

## Testing

`AuditTrailIT` is deliberately **not** `@Transactional`. Entries are written in `beforeCommit`, so a
test that rolls its transaction back would find an empty `audit_log` and pass while nothing worked;
every step there commits for real and cleans up after itself.

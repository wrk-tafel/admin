# GDPR data takeout — a concrete plan

Written for [issue #3362](https://github.com/wrk-tafel/admin/issues/3362), which asked for "a plan
with a suggestion" rather than code. This is that plan — nothing here is decided, and turning any
section below into working code needs its own issue, same convention as the rest of
[`gdpr-compliance.md`](gdpr-compliance.md). It ties together two gaps from that review:
[G5](gdpr-compliance.md#g5-a-customer-data-subject-request-can-now-be-answered-from-the-application)
(customers, [#3179](https://github.com/wrk-tafel/admin/issues/3179), done - see
[§7](#7-suggested-breakdown-into-issues)) and
[G12](gdpr-compliance.md#g12-a-staff-data-subject-request-still-cannot-be-answered-from-the-application)
(staff, [#3363](https://github.com/wrk-tafel/admin/issues/3363), added alongside this plan) — the two
data subjects this application holds data about get one shared design instead of two independent
ones.

**Erasure is deliberately out of scope.** #3362 also asked to "consider that later on the GDPR
deletion will be added" — read as: don't build it now, but don't design the takeout in a way that
makes that harder later. [§6](#6-compatibility-with-a-future-erasure-feature) is where that
consideration lives; it does not propose an erasure workflow.

## 1. What "the whole record" means, per subject

Both G5 and G12 ask the same question — "everything held about this person" — for two different
shapes of person. Writing the answer down once here means an erasure feature can reuse it verbatim
instead of re-deriving it:

**A household** (customer): the household and every person in it
(`HouseholdConverter.mapEntityToHousehold`), `household_notes`, the uploaded documents
(`HouseholdDocumentService`/`DocumentStorageService`), its `distributions_households` attendance
rows, and — see [§4](#4-open-questions) — arguably its `audit_log` entries.

**A staff member**: their `users` row (username, enabled state, `passwordChangeRequired`,
`lastLogin` — never the Argon2 hash, see [§3](#3-proposed-design--staff-takeout)), their
`user_authorities`, the linked `employees` row (personnel number, name), and — same open question —
their `audit_log` entries and `AuditScope.USER_LOGIN_ENTITY_TYPE` login history.

## 2. Design — customer takeout

Mirrors the existing `HouseholdController.generatePdf` endpoint
(`GET /api/households/{householdId}/generate-pdf`) — same `InputStreamResource` +
`Content-Disposition` pattern, same `CUSTOMER` permission, same synchronous request/response shape —
rather than inventing a new one:

- `GET /api/households/{householdId}/export` → one ZIP (built with `java.util.zip.ZipOutputStream`;
  nothing in the backend built a ZIP before this, so it was new, small code, not a reused helper)
  containing the household record — persons, notes, attendance history and the list of uploaded
  documents — as a PDF (rendered through the same `PDFService`/XSL-FO pipeline as every other PDF in
  the app), plus every file `DocumentStorageService` holds for that household, read through
  `DocumentStorageService.read`.

One combined archive rather than several separate downloads: a data-subject request normally wants
"everything you have on me" in one piece, and a requester who only wants part of it can simply
ignore the rest of the archive's contents.

Stays behind `CUSTOMER` — the permission already granted read of every field the endpoint returns, so
this needed no new permission, only the one new endpoint.

## 3. Proposed design — staff takeout

No G5 equivalent exists for staff today (see G12, added by this plan) — `UserController`'s only
self-service reads are `/api/users/info` (username/permissions, for the shell) and password/push
device management; nothing surfaces a personnel number, the full authority list or login history
in one place.

Proposed default: **self-service**, not admin-triggered —

- `GET /api/users/export` behind `isAuthenticated()` (matching `/api/users/info`'s self-only
  pattern), returning the caller's own `UserExportResponse`: username, employee (personnel number,
  name), authorities, `enabled`/`lastLogin`. **Never the password hash** — Art. 15 is about data
  concerning the subject, not about handing back security material, and a hash is useless to the
  subject anyway.

This differs from the household design on purpose: a customer's takeout is normally requested
in person or by mail and acted on by staff, so an operator-triggered endpoint matches how the
request actually arrives (see [§4](#4-open-questions)). A staff member is already authenticated
against their own account, so self-service is the natural default rather than routing every "what do
you have on me" through `USER_MANAGEMENT`. An admin-triggered `GET /api/users/{id}/export` behind
`USER_MANAGEMENT` is a plausible addition (an HR-style request made on someone's behalf, or after
they've left) but isn't proposed as part of the first cut — add it only if that need actually shows
up.

## 4. Open questions

Not blocking on the design above, but each one changes what "smallest useful step" means once an
issue is opened:

- **Should the audit trail be included?** `/api/audit/households/{householdId}` already answers
  "history for this household", but it sits behind `AUDIT_LOG`, not `CUSTOMER` — folding it into an
  endpoint gated only by `CUSTOMER` would let anyone who can open a household also read the names of
  every employee who ever edited it, which today needs a separate permission. G5's own text flags
  this ("worth deciding explicitly rather than by omission") without answering it, and this plan
  doesn't either — it's a call for whoever owns permission boundaries in this app, not an engineering
  one.
- **Who initiates a customer's takeout?** This plan assumes a staff member with `CUSTOMER`
  triggers it when a request comes in by phone, mail or in person — there's no customer-facing
  self-service anywhere in the application to route it through instead. If that assumption is wrong
  (e.g. a future customer portal), the permission model above changes.
- **Retention of the generated files.** Neither endpoint proposed above stores anything — the ZIP
  is generated on request and never written to disk or a table, so there's nothing for a future
  erasure feature to also clean up here. Confirm that's the intended behavior rather than, say,
  caching a takeout for re-download.

## 5. Recording the export itself

Both G5 and G12's write-ups call out that an export is itself a concentrated read of personal data
and should be recorded (also see
[G6](gdpr-compliance.md#g6-a-small-targeted-set-of-reads-is-now-recorded),
[#3180](https://github.com/wrk-tafel/admin/issues/3180)). Rather than waiting on G6's broader
"audit every sensitive read" work, this plan proposes the same shortcut the audit trail already took
for logins: `AuditOperation` has no `INSERT`/`UPDATE`/`DELETE`-shaped equivalent for "someone read
this", so `LOGIN` was added as a synthetic operation value, written explicitly via
`AuditLogWriter.record` from `LoginAuditService` — not through the Hibernate flush listener that
handles every other entry, since nothing is being written.

The same shape applies here: add `AuditOperation.EXPORT`, and a small service analogous to
`LoginAuditService` that calls `AuditLogWriter.record` from the export endpoint. Unlike `LOGIN`,
this needs no new synthetic entity type — `Household` and `User` are already registered in
`AuditScope`, so the call site just needs the real `entityType`/`entityId`/`businessKey` of the
household or user being exported, with the actor resolved normally (the caller is authenticated by
definition here, unlike `LoginAuditService`'s special case). One enum value and one small service,
reused by both the customer and staff endpoint.

G6 ([#3180](https://github.com/wrk-tafel/admin/issues/3180)) landed before #3179 did and already
added `AuditOperation.READ` for exactly this shape of entry (a household PDF export is one of the
examples in its own KDoc). #3179 reused that value instead of adding the `EXPORT` proposed above,
directly from `HouseholdExportService` - no separate export-audit service either, the same
`AuditLogWriter.record` call `HouseholdService.generatePdf` already made.

## 6. Compatibility with a future erasure feature

Three things above are worth keeping in mind specifically because deletion is coming later, even
though nothing here builds it:

- [§1](#1-what-the-whole-record-means-per-subject)'s enumeration of "the whole record" is written to
  be the same list an erasure feature needs to walk — reusing it means that feature doesn't
  re-derive which tables/files constitute one person's data from scratch.
- The permission model proposed above (`CUSTOMER` for households, self-service or `USER_MANAGEMENT`
  for staff) is a reasonable starting point for erasure's permission model too — whoever can read and
  export a subject's complete record is a reasonable candidate for who can also be trusted to erase
  it, though that's the future ticket's call to confirm, not this one's.
- Neither proposed endpoint stores an "export request" record beyond the audit entry from
  [§5](#5-recording-the-export-itself), which already has its own bounded retention
  (`tafeladmin.audit.retentionDays`). An erasure feature therefore isn't inheriting a new store it
  would also have to purge — see
  [G10](gdpr-compliance.md#g10-copies-survive-an-erasure-and-nobody-can-say-for-how-long), which
  already tracks exactly that failure mode for other stores.

Household erasure itself already exists in part —
[`HouseholdService.deleteHouseholdByHouseholdId`](../../backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/HouseholdService.kt)
deletes the household, cascades to persons/notes/documents and removes the files from disk — but
retention (G1, [#3178](https://github.com/wrk-tafel/admin/issues/3178)) and what survives an erasure
elsewhere in the system (G10, [#3183](https://github.com/wrk-tafel/admin/issues/3183)) are open, and
there is no equivalent for staff accounts at all. None of that is this plan's to resolve.

## 7. Suggested breakdown into issues

- [#3179](https://github.com/wrk-tafel/admin/issues/3179) (G5) — implement
  [§2](#2-design--customer-takeout): the household export endpoint. **Done** -
  `HouseholdExportService`/`HouseholdController`.
- [#3363](https://github.com/wrk-tafel/admin/issues/3363) (G12, staff) — implement
  [§3](#3-proposed-design--staff-takeout): the self-service export endpoint.
- [§5](#5-recording-the-export-itself)'s audit write is small enough to land inside each of the two
  issues above rather than as its own — the `AuditOperation.EXPORT` value only needs to exist once.

Recommended order: customer export first — it's the concrete case both #3362 and G5 were written
against, and it's the larger of the two (the combined PDF/document ZIP, versus a single JSON
response for staff).

## References

- [#3362](https://github.com/wrk-tafel/admin/issues/3362) — the issue this plan answers
- [`gdpr-compliance.md`](gdpr-compliance.md) — G5, G12
- `HouseholdController.generatePdf` — the endpoint shape this plan reuses
- `LoginAuditService` / `AuditOperation.LOGIN` — the precedent for a manually-recorded, non-CRUD
  audit entry
- [ADR-0009](adr/0009-server-side-document-generation-with-xsl-fo.md) — why synchronous
  request/response is the right default for server-generated output at this application's scale,
  which is why this plan doesn't propose an async job/poll mechanism for the export either

# GDPR (DSGVO) compliance — analysis and gaps

Analysis for [issue #3124](https://github.com/wrk-tafel/admin/issues/3124). This is a review of what
the application actually does with personal data and where that falls short of the GDPR, not a
decision record — nothing here is decided, and closing any of the gaps below needs its own ticket
(and, for the structural ones, its own ADR).

Two things to be clear about before reading on:

- **This is an engineering review, not legal advice.** It maps code to obligations. Whether a given
  processing is lawful in the end depends on facts that live with the operator, not in this
  repository — see [§6](#6-what-this-repository-cannot-answer).
- **The subject matter is sensitive even though almost none of it is Art. 9 data.** A row in
  `households` says that a named person in Vienna needed a food bank. Combined with income figures,
  household composition and nationality — all of which this application stores — that is a profile
  of financial hardship about people who are, by definition, in a weak position. Nothing below
  should be weighed as if it were a CRM.

## 1. What personal data the application holds

| Store | Whose | What | How long it stays |
|---|---|---|---|
| `households` | customers | address, phone, e-mail, validity, lock state and reason, pending cost contribution, single-parent flag | until someone deletes the household by hand, or `validUntil` has been in the past for longer than `tafeladmin.householdDeletion.retentionYears` (`HouseholdRetentionService`, 7 years by default) |
| `persons` | customers and every household member, children included | name, birth date, gender, nationality, employer, monthly income, family-allowance flag | same as `households` (cascades on delete) |
| `household_notes` | customers | free text written by staff, no restriction on content | same as `households` (cascades on delete) |
| `household_documents` + the files under `tafeladmin.storage.documentsPath` | customers | uploaded ID scans and proofs of income, as plain files (`DocumentStorageService`) | same as `households` (cascades on delete, files removed from disk too) |
| `distributions_households` | customers | which household collected food on which date, ticket number, whether the cost contribution was paid | same as `households` (cascades on delete) |
| `audit_log` | customers and staff | before/after values of every audited change, including names, addresses and income, plus who made it | `tafeladmin.audit.retentionDays`, 30 by default (`AuditRetentionService`) |
| `users`, `user_authorities` | staff | username, Argon2 password hash, permissions | until deleted by hand, or not logged into for longer than `tafeladmin.userDeletion.retentionTime` (`UserRetentionService`, 7 years by default) - never for an `ADMINISTRATOR` account, see G13 |
| `employees` | staff | personnel number, name | until deleted by hand, or referenced by nothing else at all (no user account, household, note, food collection or route stop completion) and untouched for longer than `tafeladmin.employeeDeletion.retentionTime` (`EmployeeRetentionService`, 7 years by default) - see G13 |
| `login_attempts` | staff (anyone who typed a username) | username, failure count, lockout window | cleaned hourly (`LoginAttemptService`) |
| `push_subscriptions` | staff | push endpoint URL, keys, user agent, device label | until the device is removed, or the push service reports it gone |
| `sse_outbox` | customers, indirectly | event payloads — household numbers, ticket numbers, scanner results | `tafeladmin.sse.outboxRetention`, 14 days by default (`SseOutboxService.cleanupOutbox`) |
| `mail_outbox` | customers and staff | every mail this installation sends, as the finished MIME message — report PDFs, and a support request's free text plus its screenshot of whatever screen it was written on | `tafeladmin.mailOutbox.sentRetention`, 14 days after sending; a row parked as `FAILED` gets `tafeladmin.mailOutbox.failedRetention`, 30 days after queuing (`MailOutboxService.cleanupOldMails`, ADR-0046) |
| the scanner share (`tafeladmin.storage.scannerPath`) | customers | scanned documents not yet imported or discarded | until a user imports or deletes them |
| `logs/app.log` | staff | usernames on login/logout/distribution start; no customer names were found in any log statement | Spring Boot's rolling default, 7 files |
| `logs/access.log` | customers, pseudonymously | one line per request, including `/api/households/{id}` paths | **never** — `rotate: false` in `application.yml` |
| PDFs and CSVs generated on demand | customers | Stammdatenblatt and ID card per household; the Kundenliste PDF lists everyone attending a distribution by name | outside the application the moment they are downloaded or printed |

`persons.country` (nationality) is not an Art. 9 category on its own, and the schema has no field for
health, religion or convictions. But `household_notes` and the document upload accept anything a
member of staff decides to put there, so Art. 9 data can enter the system without a single line of
code being wrong — see [G4](#g4-nothing-keeps-special-category-data-out-of-notes-and-documents).

## 2. Where personal data leaves the system

- **Report mails on distribution close** (`DistributionClosedEventListener`) carry the daily-report
  PDF and the TÖT CSV exports. Both are aggregates — age/nationality/household-size buckets, counts
  and percentages (`internal/statisticexporter/`). **No personal data leaves this way.**
- **Web Push** (`WebPushSenderService`) sends to endpoints at Google/Mozilla/Apple. The payload is
  encrypted for the subscriber's key (RFC 8291, `aes128gcm`), so the push service sees only the
  endpoint and ciphertext. Notification bodies mention staff usernames, never customers. The
  transfer that does happen is the *subscription* itself: a staff device identifier held by a
  third-country provider.
- **The in-app support form** mails whatever was typed to `tafeladmin.support.recipients`
  (`SupportService`), together with the reporter's username, the browser context of the report and a
  screenshot of the page it was written on. It stays inside the organisation's own mail, but both
  the free text and the picture can carry a customer's data — see
  [G3](#g3-the-support-form-mails-free-text-that-can-name-a-customer).
- **Downloads and prints.** The Kundenliste PDF for a distribution is a full attendance list with
  names; the Stammdatenblatt is a household's complete master data. Once printed, the application
  has no further say in them.
- **Direct SQL.** `_reporting/reporting.sql` is a set of hand-run queries, and the first one selects
  `firstname, lastname, birth_date` for the children report. Whatever it is run
  against, that access passes no `@PreAuthorize` and produces no `audit_log` entry.

## 3. What the code already gets right

Worth recording, because it is the part that does not need work:

- **Authentication and session handling.** Argon2 password hashing, JWT in an `HttpOnly` cookie with
  `Secure` derived from the request (`TafelLoginFilter.createTokenCookie`), stateless sessions,
  CSRF with a session-bound token and `SameSite=Strict`, lockout after repeated failures.
- **A tight public surface.** Exactly three endpoints are reachable without a session:
  `/api/login`, `/api/logout`, `/api/config/public` (`WebSecurityConfig.publicEndpoints`).
- **No third parties in the browser.** The CSP is `'self'` throughout, with no analytics, no fonts
  and no CDN. The only cookies are the JWT and the CSRF token — both strictly necessary, so no
  consent banner is owed and none is present.
- **Pseudonymity where it is displayed in public.** The ID-card QR code carries the bare household
  number (`HouseholdPdfService.generateQRCode`), and the ticket screen in the distribution room
  renders only a caption and a ticket number (`ticket-screen.component.html`) — the household id and
  the outstanding cost contribution stay on the staff-facing control screen.
- **Statistics are aggregated at the source.** Every exporter and every `StatisticsService` query
  produces counts, not rows about people.
- **Erasure actually erases.** `HouseholdService.deleteHouseholdByHouseholdId` deletes the household,
  cascades to persons, notes and documents, removes the files from disk, and the
  `distributions_households` foreign key is `on delete cascade`, so attendance history goes with it.
  `DocumentStorageCleanupService` sweeps up files whose rows disappeared some other way.
- **Bounded technical stores.** Outbox rows, login attempts, scanner registrations and audit entries
  all have a cleanup job. The audit retention window is short *on purpose*, and
  [ADR-0039](adr/0039-audit-trail-as-an-append-only-log-written-by-the-application.md) records that
  reasoning.
- **Logs avoid customer data**, and what does go in is sanitised against log injection
  (`LogSanitizer`).
- **Change accountability exists** since the audit trail: for the entities in `AuditScope`, who
  changed what, and what it was before, is answerable for 30 days.

## 4. Gaps

Ordered by how exposed they leave the operator, not by how hard they are to fix. G12 and G13 are the
exception — appended after the original review rather than re-ranked into it, so the existing G1–G11
numbering (and the issues already filed against it) stays stable.

### G1 A household is now deleted once it has been expired long enough

**Art. 5(1)(e), Art. 17(1)(a).** Personal data must be kept no longer than necessary, and must be
erased once the purpose is gone.

`HouseholdRetentionService` runs nightly and deletes every household whose `valid_until` is further
in the past than `tafeladmin.householdDeletion.retentionYears` (7 years by default — the Austrian
bookkeeping retention period for records touching cost contributions, UGB/BAO Section 132, chosen
as a defensible floor rather than a final legal-basis answer). Deletion goes through the same
`HouseholdService.deleteHouseholdByHouseholdId` a staff member's manual delete uses, which cascades
to persons and documents (removing the files on disk too) while the database cascades
`household_notes` and `distributions_households` on the same delete — so master data, documents and
attendance history are all one retention window rather than three, and the year-end statistics
aggregates (frozen at distribution close, ADR-0020) are unaffected. `tafeladmin.householdDeletion.enabled`
is a kill switch independent of the window, and both are read per use so an operator can change
either on a running deployment.

What remains open: the window is a floor picked without a documented legal-basis decision (see G2),
and there is no report of what the job is about to delete before it runs — an operator watching a
database this old accumulate its first deletions has only the job's log line
(`Deleted N household(s)...`) to go on.

### G2 A privacy notice now exists as a printable consent form, signed on paper

**Art. 13, Art. 5(1)(a), Art. 30(1).** Data subjects must be informed at collection; the controller
must be able to state the legal basis for each processing.

`pdf-templates/customer-pdf/includes/privacy-notice.xsl` (issue #3177) renders a "Datenschutzerklärung
und Einwilligung" sheet covering what is collected, the legal basis (Einwilligung, Art. 6(1)(a)),
retention (matching `HouseholdRetentionService`'s actual 7-year window), data-subject rights and a
complaints/contact address — with a signature line. It is downloadable per household from
customer-detail's "Daten ausdrucken" menu, and reference-less (no household to sign yet) from the
customer search screen and the global quick search (Strg+K), for a walk-in before a case record
exists. The operator settled on consent as the basis: the signed sheet is handed to the customer at
intake, and its upload back into that household's documents (`DocumentType.PRIVACY_NOTICE`) is the
whole record — there is deliberately no stored consent field anywhere in the application, so there
is nothing to go stale when a consent is withdrawn or a form is never returned. The customer search
screen's "Datenschutzerklärung fehlt" filter surfaces exactly that: households with no such document
uploaded.

Controller identity, DPO contact and the rights/complaints wording are taken from the organisation's
own published privacy notice; the purpose, legal-basis and retention paragraphs are written
specifically for this intake flow, since that page has no section covering Team-Österreich-
Tafel/aid-recipient data at all (see the template file's own header comment for the source and date
checked).

What remains open: this was drafted against the organisation's public website text rather than
routed through a documented legal/DPO sign-off process, and nothing in the application tracks
*whether* that sign-off happened — see issue #3185.

### G3 The support form mails free text that can name a customer

**Art. 5(1)(c), Art. 5(1)(f).**

The exposure this section was written for is gone: the form no longer files a public GitHub issue
but mails the request to the deployment's own support addresses
([ADR-0044](adr/0044-support-requests-sent-as-mail.md)), so a helpfully-worded "Bei Kunde Nr. 1234,
Maria Musterfrau, wird das Einkommen falsch gerechnet" no longer becomes world-readable, mirrored
and indexed within seconds.

What is left is ordinary but not nothing. The text is still free text that can name a customer, and
it now lands in a mailbox — copied to whatever that mail server and its backups keep, outside
anything this application can delete. The mail also carries the reporter's username, their browser
context (page, user agent, last errors) and **a screenshot of the page the request was written on**,
which on a customer detail screen is that household's name, address and income figures as a picture.

What makes that defensible rather than a surprise: the destination is the organisation's own
mailbox, the dialog states what is attached, and the screenshot is shown as a preview before the
request is sent (ADR-0044). It is always attached — there is deliberately no opt-out — so the
control that remains is *where the reporter is standing* when they open support, which is what the
user guide tells them.

**Smallest useful step:** a line at the note field's level of visibility in the dialog — report the
household by its number rather than by name, and leave a customer screen before reporting if what is
on it should not travel — plus a retention rule on the support mailbox, which is the operator's to
set, not the application's.

### G4 Nothing keeps special-category data out of notes and documents

**Art. 9, Art. 5(1)(c).**

`household_notes.note` is unrestricted free text, and the document upload accepts any file under
`tafeladmin.storage.maxDocumentSize` (25 MB by default). A note reading "kann wegen Physiotherapie nicht selbst kommen" is health data, and an uploaded
Meldezettel or asylum decision carries more than income. Both then sit in the household file with no
special handling, no separate permission, and — because `HouseholdNoteEntity` is in `AuditScope` —
a copy of the previous text in `audit_log` for 30 days.

Nothing in the code is wrong here; the point is that the design assumes the data class stays out,
and nothing enforces or even mentions that assumption to the person typing.

**Smallest useful step:** say it where it is typed (a hint on the note field and the upload dialog)
and in the user guide chapter for the Kunden screen. Field-level restriction is not realistic; a
short, visible rule is.

### G5 A customer data-subject request can now be answered from the application

**Art. 15, Art. 20.**

`HouseholdExportService` (issue #3179, see [`gdpr-data-takeout-plan.md`](gdpr-data-takeout-plan.md))
serves one ZIP behind the same `CUSTOMER` permission as the rest of a household's data, from
customer-detail's "Weitere Aktionen" menu: `GET /households/{householdId}/export` — household,
persons, notes (via the unpaged `HouseholdNoteService.getAllNotes`, so a page-size cap can't silently
truncate the record), distribution attendance history and the list of uploaded documents, as a PDF —
plus every uploaded document itself. One combined archive rather than several separate downloads: a
data-subject request normally wants "everything you have on me" in one piece.
The endpoint stores nothing; the archive is built on request and never written to disk or a table. It
is recorded in the audit trail as a single `AuditOperation.READ` entry against the household
(G6/#3180), the same way `generatePdf` already was.

What remains open: `audit_log` entries about the household are deliberately excluded from the export —
left as an unanswered permission-boundary question in the takeout plan's §4 rather than folded in by
omission. [G12](#g12-a-staff-data-subject-request-can-now-be-answered-from-the-application), the
same question for staff instead of customers, leaves the same question open for the same reason.

### G6 A small, targeted set of reads is now recorded

**Art. 5(2), Art. 32.**

The audit trail used to record writes only. Opening a household or downloading its ID scans left no
trace — so "did somebody look up their neighbour's income" was a question the system could not
answer, in an organisation where volunteers and the customers can live in the same district.
Auditing every read would be noise for an application this size; the sensitive handful is not.

`AuditOperation.READ` entries are now written for exactly that handful: document download
(`HouseholdDocumentService.getDocumentFile`), viewing a not-yet-imported scanner file
(`DocumentScannerController`), Stammdatenblatt/Ausweis generation (`HouseholdService.generatePdf`),
Kundenliste generation for a distribution (`DistributionService`), and the G5 data-subject export
(`HouseholdExportService`). They land in the same `audit_log` table and retention window as writes,
and show up on the existing Änderungsprotokoll screen and a household's "Verlauf" tab like any other
entry.

What remains open: [G11](#g11-a-fixed-threshold-now-flags-excessive-read-access) is the detection
this made possible, not this gap itself.

### G7 The documents tab now requires its own permission, separate from CUSTOMER

**Art. 5(1)(c), Art. 32(1)(b).**

`CUSTOMER` used to be a single flag granting read and write on every household, every note, every
income figure and every uploaded ID scan — `HouseholdNoteController`, `HouseholdDocumentController`
and `DocumentScannerController` required it once at class level, `HouseholdController` on each of
its methods that isn't behind one of the narrower customer permissions. Check-in staff who only
need to confirm that a number is valid held the same access as the person doing the income
assessment. `ADMINISTRATOR` still expands to everything by design.

`HouseholdDocumentController` and `DocumentScannerController` — the ID scans, proofs of income and
the not-yet-imported scanner-folder files behind them, the most sensitive artefacts the application
stores — now require a separate `CUSTOMER_DOCUMENTS` permission instead (`UserPermissions.kt`), and
the customer detail screen's "Dokumente" tab is hidden without it, the same pattern the "Verlauf"
tab already used for `AUDIT_LOG`. See [ADR-0050](adr/0050-customer-documents-split-into-its-own-permission.md)
for the full decision and its consequences, and issue #3181.

What remains open: `HouseholdController`'s own endpoints (household master data, income, cost
contribution) are still behind the single broader `CUSTOMER`, and — unchanged by this — nobody has
written down who holds `CUSTOMER` or `CUSTOMER_DOCUMENTS` today and why; that write-up is the
operator's, tracked with the rest of [§6](#6-what-this-repository-cannot-answer) in #3185.
[G6](#g6-a-small-targeted-set-of-reads-is-now-recorded) now traces who actually read a document or
generated a Stammdatenblatt; this gap only ever limited who could.

### G8 Documents and database rows are stored unencrypted by the application

**Art. 32(1)(a).**

Uploaded documents are written as plain files under `<documentsPath>/<householdId>/<uuid>_<name>`,
and the database columns are plain text. That is a normal design — encryption at rest is expected to
come from the volume and the database host — but the repository holds no evidence that it does, and
[ADR-0021](adr/0021-documents-on-a-volume-metadata-in-the-database.md) puts the backup obligation on
the operator without settling encryption. The per-household directory layout also means a copied
volume is trivially browsable by household number.

**Smallest useful step:** confirm with the operator that the documents volume, the database volume
and their backups are on encrypted storage, and record the answer — in ADR-0021's consequences or a
new record — rather than leaving it assumed.

### G9 The access log never rotates and never expires

**Art. 5(1)(e).**

`server.tomcat.accesslog.rotate: false` in `application.yml` means `logs/access.log` is a single file
that grows for the life of the deployment, holding one line per request — including every
`/api/households/{id}` path, i.e. a permanent record of which case files were opened when, from
which address as the container sees it. It is the one store in the system with no bound at all, and
unlike the audit trail nobody chose it: it is a default nobody revisited.

Before [G6](#g6-a-small-targeted-set-of-reads-is-now-recorded), this was also the closest thing to a
read log that existed — an accident rather than a control, since it was neither queryable nor
scoped. `audit_log` is now the real, scoped read log; `access.log` is still unbounded regardless.

**Smallest useful step:** turn rotation on and set a retention (`max-days`), matching `audit_log`'s
own retention window.

### G10 Copies survive an erasure, and nobody can say for how long

**Art. 17(1), Art. 19.**

Deleting a household is thorough in the database, but copies outlive it: `audit_log` entries for up
to 30 days (deliberate, and documented in ADR-0039), `sse_outbox` payloads for 14, `mail_outbox`
rows — the composed mails, attachments included — for 14 after they were sent (ADR-0041) or 30 after
they were queued if delivery was given up on (ADR-0046), any Kundenliste PDF already printed or
mailed, and every backup made before the deletion. Restoring a backup re-creates erased people, and
nothing propagates the erasure into it.

Every copy inside the application now has a clock on it, which was not true of a `mail_outbox` row
parked as `FAILED`: it kept its full MIME message — report PDF or support screenshot included — until
somebody removed the row by hand, which no screen ever prompted anyone to do.

What is left is outside the application: a printed or mailed PDF, and the operator's backups.

**Smallest useful step:** write down the actual erasure timeline — which store empties after how long
— so a request can be answered honestly ("gelöscht, letzte technische Spuren nach 30 Tagen"), and
agree with the operator how backup restores are followed by a re-run of pending deletions.

### G11 A fixed threshold now flags excessive read access

**Art. 33, Art. 32(1)(d).**

The only security signal the application used to produce was the lockout push after repeated failed
logins (`UserLockedOutPushListener`). Nothing noticed or reported a session downloading every
document in sequence, an export run at an odd hour, or a database dump. With no read log
([G6](#g6-a-small-targeted-set-of-reads-is-now-recorded)), a breach that used a legitimate account
would have left nothing behind to detect or reconstruct — which also made the 72-hour notification
duty impossible to discharge with any accuracy.

`ExcessiveReadAccessDetectionService` (`modules/push/internal`) now runs hourly and pushes a
notification to administrators when one user's `AuditOperation.READ` count in the trailing hour
exceeds `tafeladmin.audit.breachDetection.readThreshold` (default 20). Deliberately just a fixed
threshold rather than anomaly detection: an application this size has no learned "normal" to compare
against, and a detector nobody understands is a detector nobody trusts.

What remains open: this covers one realistic case — a single account reading an unusual volume — not
every way a breach could look, and whether a fixed threshold is the right long-term answer (versus,
say, per-role baselines) is a judgement call rather than a settled one.

### G12 A staff data-subject request can now be answered from the application

**Art. 15, Art. 20.**

The same question [G5](#g5-a-customer-data-subject-request-can-now-be-answered-from-the-application)
answered, for the other data subject this application holds data about: `users`, `user_authorities`
and the linked `employees` row. A staff member asking "what do you have on me" used to get nothing
from the application — `UserController`'s only self-service reads were `/api/users/info` (username
and permissions, for the shell) and password/push-device management; nothing surfaced a personnel
number, the full authority list or login history in one place, and there was no export.

`UserExportService` (issue #3363, see [`gdpr-data-takeout-plan.md`](gdpr-data-takeout-plan.md) §3)
serves a PDF - the same `PDFService`/XSL-FO pipeline as the household export - with master data
(username, employee personnel number/name, `enabled`, `lastLogin`) and every assigned permission.
Never the password hash. Recorded in the audit trail as a single `AuditOperation.READ` entry against
the user (G6/#3180), the same way G5's export is. Reachable two ways: `GET /api/users/export` behind
`isAuthenticated()` (matching `/api/users/info`'s self-only pattern), from the user menu's "Meine
Daten exportieren" entry; and `GET /api/users/{userId}/export` behind `USER_MANAGEMENT`, from a
user's detail screen's "Daten exportieren (PDF)" button, for a request made on someone's behalf.

Added alongside [#3362](https://github.com/wrk-tafel/admin/issues/3362), which asked for a takeout
plan covering "either customers or internal employees" — the original review (#3124) only considered
the customer side.

What remains open: same as G5, `audit_log` entries about the user are deliberately excluded from the
export — left as an unanswered permission-boundary question in the takeout plan's §4. Settled, not
open: the export does not follow references *into* other tables either - a household this person
issued, a note they authored, a food collection they drove - since that data is substantively the
referenced record's own, with this person's name attached only as attribution. See the takeout
plan's §1 "Scope" note.

### G13 A system user or employee account now expires too, mirroring G1

**Art. 5(1)(e), Art. 17(1)(a).** Same obligation as G1, for the other data subject who gets a login:
personal data must be kept no longer than necessary, and must be erased once the purpose is gone. A
`users` row - and the `employees` row behind it - otherwise stayed in the database, permissions and
all, until an administrator opened it and pressed delete; nothing expired it on its own the way G1's
`HouseholdRetentionService` now does for a household.

Unlike a household, neither entity has a field that encodes "no longer relevant" the way
`validUntil` does, which is why this needed its own decision rather than reusing G1's job outright:

- **`users`** (`UserRetentionService`) treats `lastLogin` as the trigger, directly, rather than an
  inferred proxy - falling back to `createdAt` for an account that has never logged in at all, so a
  forgotten never-used account still ages out. This applies regardless of `enabled`: a still-enabled
  account nobody has used in the window is exactly what this job is for. **An `ADMINISTRATOR` account
  is never a candidate, full stop, regardless of `enabled` or age** - stricter than `UserController`'s
  manual safeguards, which only ever protect the *last* enabled one. Deletion goes through
  `TafelUserDetailsManager.deleteUser`, the same method the manual `DELETE /api/users/{userId}`
  endpoint uses, and defaults to 7 years - unified with `householdDeletion.retentionYears` and
  `employeeDeletion.retentionTime` as one consistent retention floor across the application, even
  though unlike `householdDeletion.retentionYears` (a bookkeeping-law period) there is no single
  statute this particular window has to clear.
- **`employees`** (`EmployeeRetentionService`) is deliberately a separate job: an employee is a shared
  record other modules reference by a plain, non-cascading FK (household issuer, household notes, food
  collection driver/co-driver, route stop completion recorder) that already tolerates a missing
  employee by design - `EmployeeService.deleteEmployee` lets a staff member delete one by hand at any
  time, showing "Mitarbeiter gelöscht" wherever such a reference is displayed, and only refuses when a
  user account is still linked. This job is *stricter* than that manual delete: it only ever considers
  an employee referenced by **nothing** - not just no linked user account, but none of `households`,
  `household_notes`, `food_collections` (driver or co-driver) or `routes_stops_completions` either -
  since silently blanking a reference on a record that is itself well within its own retention window
  would erase part of a still-live case file rather than an abandoned one. Measured from `updated_at`,
  defaulting to 7 years - the same unified floor as `userDeletion.retentionTime` and
  `householdDeletion.retentionYears`, even though an employee this job ever actually reaches is, by
  definition, not the issuer/driver/recorder of anything still on record, so no bookkeeping period
  specifically applies to it.

Both jobs are configurable and switchable per deployment
(`tafeladmin.userDeletion.*`/`tafeladmin.employeeDeletion.*`, read per use), run nightly after
`HouseholdRetentionService` (06:00) at 06:15/06:30, and claim their candidates with `FOR UPDATE SKIP
LOCKED` (ADR-0047) the same way G1 does. What remains open, same as G1: both windows are floors picked
without a documented legal-basis decision (see G2), and there is no report of what either job is about
to delete before it runs.

### G14 An employee with no user account can now be exported too, closing a gap G12 left open

**Art. 15, Art. 20.** G12's own export assumed every staff member has a `users` row to key off of -
but `EmployeeEntity` (personnel number, first/last name) can exist entirely on its own, referenced as
a household's issuer, a household note's author, or a food collection's driver/co-driver, with nobody
ever logging in as them (someone who only drives for a route, say). For that person there was no
export path at all: not self-service (no account to authenticate with), and not admin-triggered
either, since `UserController.exportUserById` is keyed by a `userId` such an employee never has, and
the Mitarbeiter settings screen (`SettingsEmployeesComponent`) had no detail view to hang an export
action off of.

Found while implementing G12 (issue #3394). `EmployeeExportService` closes it with the same
`PDFService`/XSL-FO pipeline as G12's own export, master data only (personnel number, name, created
date) - an `EmployeeEntity` holds nothing else, so there is no permissions table the way G12's export
has one. Recorded in the audit trail as a single `AuditOperation.READ` entry (G6/#3180), the same way
G5's and G12's exports are - even though `EmployeeEntity` writes themselves are not audited at all
(see G13's own note that employee writes aren't in `AuditScope`'s map). Reachable from
`GET /api/employees/{employeeId}/export`, an export action in the Mitarbeiter table's row actions,
behind `SETTINGS` rather than `USER_MANAGEMENT` - the permission `EmployeeController` itself already
requires, since there is no self-service angle for an employee with no account of their own.

Refuses (409) an employee a `users` row already references - one person is meant to have exactly one
takeout document, and `UserExportService`'s own master data already carries the linked employee's
personnel number and name, so a second, less complete PDF here would be a duplicate rather than a
second useful export. The frontend hides the button for exactly that case, and the linked account's
own detail page is where the complete export for that person already lives.

What remains open: same as G5/G12, `audit_log` entries about the employee are excluded from the
export. Settled, not open, same as G12: this export is master data about the employee themselves
only - it does not follow the reverse references above (issuer/author/driver) back into the
household, note or food collection rows that name them, since those rows are substantively that
other record's own data. See the takeout plan's §1 "Scope" note.

## 5. Checked and found fine

Recorded so the next reader does not re-investigate them:

- **Statistics and report mails** contain no personal data — the exporters aggregate before anything
  leaves (`internal/statisticexporter/`).
- **Push payloads** carry no customer data and are encrypted for the recipient device.
- **The public ticket screen** shows a caption and a number, nothing identifying.
- **The QR code** on the ID card is the household number only.
- **Cookies** are limited to the session JWT and the CSRF token, both strictly necessary, so no
  consent mechanism is owed.
- **Art. 22 (automated decisions)** is not engaged: `IncomeValidatorService` computes a limit and
  shows the result; a member of staff makes the decision, and the outcome is visibly overridable
  (`CUSTOMERS_ABOVE_LIMIT`).
- **Legacy customer tables** are gone — `R__00068_household_person_cleanup.sql` drops `customers`
  and `customers_addpersons` after verifying every row migrated, so no duplicate copy of the master
  data survives.

## 6. What this repository cannot answer

These are the operator's, not the codebase's, and no amount of work in this repository closes them.
They are listed because a gap analysis that omits them reads as if the application were the whole
picture:

- the record of processing activities (Art. 30) and whether it matches what §1 found;
- a DPIA (Art. 35) — processing data about the financial hardship of vulnerable people, at scale for
  the organisation, is the kind of processing that normally requires one;
- processor agreements (Art. 28) for hosting, the SMTP provider, GitHub and the push services, plus
  the transfer basis for the third-country ones (Art. 44 ff.);
- backup retention, encryption and how erasure is propagated into restores;
- what happens to printed Kundenlisten and Stammdatenblätter after a distribution;
- who holds which account and permission today, and when that was last reviewed;
- the incident process behind Art. 33's 72 hours;
- who runs `_reporting/reporting.sql`, against what, and where its output goes.

## 7. Where to start

Every gap below has its own issue; [§6](#6-what-this-repository-cannot-answer) is collected in
[#3185](https://github.com/wrk-tafel/admin/issues/3185), which most of the rest is blocked on.

| | Gap | Issue | Cost | First step |
|---|---|---|---|---|
| 1 | [G9](#g9-the-access-log-never-rotates-and-never-expires) access log unbounded | [#3174](https://github.com/wrk-tafel/admin/issues/3174) | hours | rotation + retention in `application.yml` |
| 2 | [G4](#g4-nothing-keeps-special-category-data-out-of-notes-and-documents) special-category data in free text | [#3175](https://github.com/wrk-tafel/admin/issues/3175) | hours | a visible rule at the note field, upload dialog and user guide |
| 3 | [G3](#g3-the-support-form-mails-free-text-that-can-name-a-customer) support text can name a customer | [#3176](https://github.com/wrk-tafel/admin/issues/3176) | hours | a line in the dialog, plus retention on the support mailbox |
| 4 | [G2](#g2-a-privacy-notice-now-exists-as-a-printable-consent-form-signed-on-paper) privacy notice | [#3177](https://github.com/wrk-tafel/admin/issues/3177) | done | printable consent form, per-household and reference-less |
| 5 | [G1](#g1-a-household-is-now-deleted-once-it-has-been-expired-long-enough) retention for customer data | [#3178](https://github.com/wrk-tafel/admin/issues/3178) | done | nightly job modelled on `AuditRetentionService`, `tafeladmin.householdDeletion.*` |
| 6 | [G5](#g5-a-customer-data-subject-request-can-now-be-answered-from-the-application) no Art. 15/20 export | [#3179](https://github.com/wrk-tafel/admin/issues/3179) | done | two endpoints, household record + documents, on `HouseholdExportService` |
| 7 | [G6](#g6-a-small-targeted-set-of-reads-is-now-recorded) reads unrecorded | [#3180](https://github.com/wrk-tafel/admin/issues/3180) | done | `AuditOperation.READ` on document download, PDF/Kundenliste generation and the G5 export |
| 8 | [G8](#g8-documents-and-database-rows-are-stored-unencrypted-by-the-application), [G10](#g10-copies-survive-an-erasure-and-nobody-can-say-for-how-long) | [#3182](https://github.com/wrk-tafel/admin/issues/3182), [#3183](https://github.com/wrk-tafel/admin/issues/3183) | structural | each needs a decision with the operator before code |
| 9 | [G12](#g12-a-staff-data-subject-request-can-now-be-answered-from-the-application) no Art. 15/20 export for staff | [#3363](https://github.com/wrk-tafel/admin/issues/3363) | done | `GET /api/users/export`, `UserExportService` |
| 10 | [G13](#g13-a-system-user-or-employee-account-now-expires-too-mirroring-g1) retention for staff accounts | [#3386](https://github.com/wrk-tafel/admin/issues/3386) | done | nightly jobs modelled on `HouseholdRetentionService`, `tafeladmin.userDeletion.*`/`tafeladmin.employeeDeletion.*` |
| 11 | [G14](#g14-an-employee-with-no-user-account-can-now-be-exported-too-closing-a-gap-g12-left-open) no Art. 15/20 export for an employee with no user account | [#3394](https://github.com/wrk-tafel/admin/issues/3394) | done | `GET /api/employees/{employeeId}/export`, `EmployeeExportService` |
| 11 | [G7](#g7-the-documents-tab-now-requires-its-own-permission-separate-from-customer) documents tab behind its own permission | [#3181](https://github.com/wrk-tafel/admin/issues/3181) | done | `CUSTOMER_DOCUMENTS`, see [ADR-0050](adr/0050-customer-documents-split-into-its-own-permission.md) |
| 12 | [G11](#g11-a-fixed-threshold-now-flags-excessive-read-access) no breach detection | [#3184](https://github.com/wrk-tafel/admin/issues/3184) | done | `ExcessiveReadAccessDetectionService`, a fixed hourly read-count threshold |

G3 and G4 are worth doing regardless of what the operator decides; G9 no longer needs G6's answer
first but is otherwise unchanged. G2, G1, G13, G5, G6, G7, G11 and G12 are done. Of what remains
(G8, G10), both depend on answers that come from outside this repository — which makes
[§6](#6-what-this-repository-cannot-answer) the actual critical path, not the code.

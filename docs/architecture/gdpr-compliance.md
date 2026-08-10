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
| `households` | customers | address, phone, e-mail, validity, lock state and reason, pending cost contribution, single-parent flag | until someone deletes the household by hand |
| `persons` | customers and every household member, children included | name, birth date, gender, nationality, employer, monthly income, family-allowance flag | same |
| `household_notes` | customers | free text written by staff, no restriction on content | same |
| `household_documents` + the files under `tafeladmin.storage.documentsPath` | customers | uploaded ID scans and proofs of income, as plain files (`DocumentStorageService`) | same |
| `distributions_households` | customers | which household collected food on which date, ticket number, whether the cost contribution was paid | forever — no cleanup exists |
| `audit_log` | customers and staff | before/after values of every audited change, including names, addresses and income, plus who made it | `tafeladmin.audit.retentionDays`, 30 by default (`AuditRetentionService`) |
| `users`, `user_authorities`, `employees` | staff | username, Argon2 password hash, permissions, personnel number, name | until the account is deleted |
| `login_attempts` | staff (anyone who typed a username) | username, failure count, lockout window | cleaned hourly (`LoginAttemptService`) |
| `push_subscriptions` | staff | push endpoint URL, keys, user agent, device label | until the device is removed, or the push service reports it gone |
| `sse_outbox` | customers, indirectly | event payloads — household numbers, ticket numbers, scanner results | `tafeladmin.sse.outboxRetention`, 14 days by default (`SseOutboxService.cleanupOutbox`) |
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
  `firstname, lastname, birth_date` for the school-starter-package report. Whatever it is run
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

Ordered by how exposed they leave the operator, not by how hard they are to fix.

### G1 Nothing about a customer ever expires

**Art. 5(1)(e), Art. 17(1)(a).** Personal data must be kept no longer than necessary, and must be
erased once the purpose is gone.

A household stays in the database in full — names, address, income, ID scans, every distribution it
ever attended — until a member of staff opens it and presses delete. `valid_until` passing changes
nothing; it only takes the household out of the eligible set. There is no retention setting, no
scheduled job, and no screen that surfaces "these 300 households have been expired for four years".
The only stores with a retention rule are the technical ones (audit, outbox, login attempts).

In practice this means the oldest personal data in the system is as old as the system, and nobody
can say how much of it is still needed.

**Smallest useful step:** decide a retention period per data class with the operator (master data,
documents, attendance history are three different answers), then add the cleanup the way
`AuditRetentionService` is built — a configurable window, a nightly job, and a log line. A report of
what *would* be deleted, shipped before the deletion itself, is the cheap way to make the first run
safe.

### G2 There is no privacy notice and no record of a legal basis

**Art. 13, Art. 5(1)(a), Art. 30(1).** Data subjects must be informed at collection; the controller
must be able to state the legal basis for each processing.

Nothing in the repository mentions Datenschutz, DSGVO or consent — not in the UI, not on the
Stammdatenblatt the customer receives, not in the user guide. `HouseholdEntity` has no field
recording a legal basis, a consent, its date, or its withdrawal. When a customer asks "what did I
agree to and when", the application cannot answer, and staff have nothing to hand out.

Whether *consent* is even the right basis here is the operator's call — for a food bank, Art. 6(1)(e)
or (f) with a documented legitimate-interest assessment is often the better fit, and consent is
awkward precisely because refusing it would cost the person the aid. Either way the application
currently records nothing.

**Smallest useful step:** get the notice text from the operator, print it on the Stammdatenblatt
(`pdf-templates/customer-pdf/masterdata-document.xsl`) and link it in the shell. Only add a stored
consent field if the operator settles on consent as the basis — a field nobody maintains is worse
than none.

### G3 The support form mails free text that can name a customer

**Art. 5(1)(c), Art. 5(1)(f).**

The exposure this section was written for is gone: the form no longer files a public GitHub issue
but mails the request to the deployment's own support addresses
([ADR-0040](adr/0040-support-requests-sent-as-mail.md)), so a helpfully-worded "Bei Kunde Nr. 1234,
Maria Musterfrau, wird das Einkommen falsch gerechnet" no longer becomes world-readable, mirrored
and indexed within seconds.

What is left is ordinary but not nothing. The text is still free text that can name a customer, and
it now lands in a mailbox — copied to whatever that mail server and its backups keep, outside
anything this application can delete. The mail also carries the reporter's username, their browser
context (page, user agent, last errors) and **a screenshot of the page the request was written on**,
which on a customer detail screen is that household's name, address and income figures as a picture.

What makes that defensible rather than a surprise: the destination is the organisation's own
mailbox, the dialog states what is attached, and the screenshot is shown as a preview before the
request is sent (ADR-0040). It is always attached — there is deliberately no opt-out — so the
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

### G5 A data-subject request cannot be answered from the application

**Art. 15, Art. 20.**

A customer asking for a copy of everything held about them would need: master data, all household
members, notes, the list and content of uploaded documents, attendance history, and — arguably — the
audit entries about them. The application offers the Stammdatenblatt PDF, which covers the first
part. Everything else has to be assembled by hand from the UI, or by querying the database directly.
There is no "export this household" action and no machine-readable format.

The same gap makes it impossible to tell a requester what was erased and what remains.

**Smallest useful step:** one endpoint behind `CUSTOMER` that returns the household's full record as
JSON, plus a ZIP with the documents — most of the mapping already exists in `HouseholdConverter` and
`HouseholdDocumentService`.

### G6 Read access to a case file is not recorded

**Art. 5(2), Art. 32.**

The audit trail records writes. Opening a household, downloading its ID scans or exporting the
Kundenliste leaves no trace — so "did somebody look up their neighbour's income" is a question the
system cannot answer, in an organisation where volunteers and the customers can live in the same
district. For a small application, auditing every read would be noise; auditing the sensitive
handful (document download, Stammdatenblatt/Kundenliste generation) would not.

**Smallest useful step:** extend `AuditLogWriter` with a read/export operation and call it from the
document download and the two PDF endpoints. The retention window and the existing
Änderungsprotokoll screen carry it from there.

### G7 One permission grants every customer's complete file

**Art. 5(1)(c), Art. 32(1)(b).**

`CUSTOMER` is a single flag, and it grants read and write on every household, every note, every
income figure and every uploaded ID scan (`HouseholdController`, `HouseholdNoteController`,
`HouseholdDocumentController` are each annotated once at class level). Check-in staff who only need
to confirm that a number is valid hold the same access as the person doing the income assessment.
`ADMINISTRATOR` expands to everything by design.

This may well be proportionate for a team of this size — but it is a decision nobody has recorded,
and combined with [G6](#g6-read-access-to-a-case-file-is-not-recorded) there is neither a limit nor a
trace.

**Smallest useful step:** write down who holds `CUSTOMER` today and why, then decide whether the
documents tab in particular deserves its own permission. That one split is cheap and covers the most
sensitive artefacts in the system.

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

Note that this is also the closest thing to a read log that exists today — which makes it an
accident rather than a control, since it is neither queryable nor scoped.

**Smallest useful step:** turn rotation on and set a retention (`max-days`), matching whatever
retention [G6](#g6-read-access-to-a-case-file-is-not-recorded) lands on if a real read log is built.

### G10 Copies survive an erasure, and nobody can say for how long

**Art. 17(1), Art. 19.**

Deleting a household is thorough in the database, but copies outlive it: `audit_log` entries for up
to 30 days (deliberate, and documented in ADR-0039), `sse_outbox` payloads for 14, `mail_outbox`
rows — the composed mails, attachments included — for 14 after they were sent (ADR-0041), any
Kundenliste PDF already printed or mailed, and every backup made before the deletion. Restoring a backup
re-creates erased people, and nothing propagates the erasure into it.

**Smallest useful step:** write down the actual erasure timeline — which store empties after how long
— so a request can be answered honestly ("gelöscht, letzte technische Spuren nach 30 Tagen"), and
agree with the operator how backup restores are followed by a re-run of pending deletions.

### G11 There is no way to notice a breach

**Art. 33, Art. 32(1)(d).**

The only security signal the application produces is the lockout push after repeated failed logins
(`UserLockedOutPushListener`). Nothing notices or reports a session downloading every document in
sequence, an export run at an odd hour, or a database dump. With no read log
([G6](#g6-read-access-to-a-case-file-is-not-recorded)), a breach that used a legitimate account would
leave nothing behind to detect or reconstruct — which also makes the 72-hour notification duty
impossible to discharge with any accuracy.

**Smallest useful step:** this only becomes tractable after G6. Once reads are recorded, a simple
threshold ("more than N documents downloaded by one user in an hour") reusing the existing push
channel covers the realistic case.

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

| | Gap | Cost | First step |
|---|---|---|---|
| 1 | [G9](#g9-the-access-log-never-rotates-and-never-expires) access log unbounded | hours | rotation + retention in `application.yml` |
| 2 | [G4](#g4-nothing-keeps-special-category-data-out-of-notes-and-documents) special-category data in free text | hours | a visible rule at the note field, upload dialog and user guide |
| 3 | [G3](#g3-the-support-form-mails-free-text-that-can-name-a-customer) support text can name a customer | hours | a line in the dialog, plus retention on the support mailbox |
| 4 | [G2](#g2-there-is-no-privacy-notice-and-no-record-of-a-legal-basis) no privacy notice | days, mostly the operator's | notice text on the Stammdatenblatt and in the shell |
| 5 | [G1](#g1-nothing-about-a-customer-ever-expires) no retention for customer data | days, needs a decision first | agree the periods, then a nightly job modelled on `AuditRetentionService` |
| 6 | [G5](#g5-a-data-subject-request-cannot-be-answered-from-the-application) no Art. 15/20 export | days | one endpoint returning the full household record + documents |
| 7 | [G6](#g6-read-access-to-a-case-file-is-not-recorded) reads unrecorded | days | audit document downloads and PDF generation |
| 8 | [G7](#g7-one-permission-grants-every-customers-complete-file), [G8](#g8-documents-and-database-rows-are-stored-unencrypted-by-the-application), [G10](#g10-copies-survive-an-erasure-and-nobody-can-say-for-how-long), [G11](#g11-there-is-no-way-to-notice-a-breach) | structural | each needs a decision with the operator before code |

G3, G9 and G4 are worth doing regardless of what the operator decides. Everything from G2 downwards
depends on answers that come from outside this repository — which makes
[§6](#6-what-this-repository-cannot-answer) the actual critical path, not the code.

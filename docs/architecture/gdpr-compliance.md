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
| `households` | customers | address, phone, e-mail, validity, lock state and reason, pending cost contribution, single-parent flag | until someone deletes the household by hand, or `validUntil` has been in the past for longer than `tafeladmin.householdDeletion.retentionTime` (`HouseholdRetentionService`, 7 years by default) |
| `persons` | customers and every household member, children included | name, birth date, gender, nationality, employer, monthly income, family-allowance flag | same as `households` (cascades on delete) |
| `household_notes` | customers | free text written by staff, no restriction on content | same as `households` (cascades on delete) |
| `household_documents` + the files under `tafeladmin.storage.documentsPath` | customers | uploaded ID scans and proofs of income, as plain files (`DocumentStorageService`) | same as `households` (cascades on delete, files removed from disk too) |
| `distributions_households` | customers | which household collected food on which date, ticket number, whether the cost contribution was paid | same as `households` (cascades on delete) |
| `household_duplicate_dismissals` | customers | pairs of household numbers a reviewer judged not to be duplicates, plus the reviewer's account (`created_by`, a user-id FK cleared when that account is deleted) | same as `households` (cascades on delete, via a foreign key on the business `household_id` rather than the surrogate `id` the other rows here use) |
| `audit_log` | customers and staff | before/after values of every audited change, including names, addresses and income, plus who made it | `tafeladmin.audit.retentionDays`, 30 by default (`AuditRetentionService`) |
| `users`, `user_authorities` | staff | username, Argon2 password hash, permissions, `last_login`, `token_invalidated_at` (the logout/password-change cut-off for issued JWTs, `R__00109`) | until deleted by hand, or not logged into for longer than `tafeladmin.userDeletion.retentionTime` (`UserRetentionService`, 7 years by default) - never for an `ADMINISTRATOR` account, see G13 |
| `employees` | staff | personnel number, name | until deleted by hand, or referenced by nothing else at all (no user account, household, note, food collection or route stop completion) and untouched for longer than `tafeladmin.employeeDeletion.retentionTime` (`EmployeeRetentionService`, 7 years by default) - see G13 |
| `login_attempts` | staff (anyone who typed a username) | username, failure count, lockout window | cleaned hourly (`LoginAttemptService`) |
| `login_attempts_ip` (`R__00112`) | anyone who reached the login endpoint | client IP address, failure count, lockout window — an IP address is personal data on its own | cleaned hourly (`LoginAttemptIpService.cleanupStaleEntries`); the per-IP request-rate buckets of `RateLimiterIpService` (G23) are the in-memory counterpart, keyed by IP too and swept hourly, never persisted |
| `push_subscriptions` | staff | push endpoint URL, keys, user agent, device label | until the device is removed, or the push service reports it gone |
| `push_preferences`, `push_type_preferences` | staff | per-user notification opt-in and per-type opt-outs | as long as the user account lives |
| `food_collections` (`driver_employee_id`, `co_driver_employee_id`), `routes_stops_completions` (`employee_id`) | staff | which employee drove or recorded which collection/stop | no retention job of their own; the employee reference is `on delete set null` (`R__00106`), and the employee row itself stays until nothing references it any more — see G13 |
| `sse_outbox` | customers, indirectly | event payloads — household numbers, ticket numbers, scanner results | `tafeladmin.sse.outboxRetention`, 14 days by default (`SseOutboxService.cleanupOutbox`) |
| `mail_outbox` | customers and staff | every mail this installation sends, as the finished MIME message — report PDFs, and a support request's free text plus its screenshot of whatever screen it was written on | `tafeladmin.mailOutbox.sentRetention`, 14 days after sending; a row parked as `FAILED` gets `tafeladmin.mailOutbox.failedRetention`, 30 days after queuing (`MailOutboxService.cleanupOldMails`, ADR-0046) |
| the scanner share (`tafeladmin.storage.scannerPath`) | customers | scanned documents not yet imported or discarded | `tafeladmin.storage.scannerFileRetention`, 7 days by default (`ScannerFileCleanupService`), or until a user imports or deletes it first |
| `logs/app.log` | staff, and anyone who reached the login endpoint | usernames on login/logout/distribution start, the client IP when a locked-out IP is rejected (`TafelLoginProvider`, WARN); at DEBUG, which is off in production, `MailOutboxService` also logs a queued mail's recipient addresses. No customer names were found in any log statement | Spring Boot's rolling default, 7 files |
| `logs/access.log` | customers — pseudonymously by path, by name through the query string | one line per request, including `/api/households/{id}` paths and, with Tomcat's default pattern, the full query string — so a search's `?searchInput=<name>` too, see [G25](#g25-a-search-term-is-a-name-and-it-travels-into-the-access-log-the-url-and-the-support-mail) | **never** — `rotate: false` in `application.yml` |
| PDFs and CSVs generated on demand | customers | Stammdatenblatt and ID card per household; the Kundenliste PDF is a distribution's attendance list — ticket number, household number, person and infant counts, no names; the above-limit and overview CSVs (`HouseholdService.generateAboveLimitCsv`/`generateHouseholdsOverviewCsv`) are per-household rows *with* name and address — see [G24](#g24-the-name-bearing-csv-downloads-are-not-recorded-and-not-inventoried) | outside the application the moment they are downloaded or printed |
| `shelters_contacts` | shelter contacts (not staff, not customers) | name, phone | manual only — no retention job; cascades when its shelter is deleted |
| `shops` (`contact_person`, `phone`, `note`) | shop contacts (not staff, not customers) | contact name, phone, a free-text note | manual only — no retention job |
| `mail_recipients` | whoever an operator configured as a mail recipient | an e-mail address, which may identify a named individual | manual only — no retention job |
| `created_by`/`updated_by` (27 tables — `R__00092`/`R__00096`/`R__00102`/`R__00112`, made a user-id FK by `R__00111`, see [G17](#g17-a-deleted-accounts-username-no-longer-outlives-it-on-every-other-table)) | staff | which account last touched a row | as long as the row lives, unless that account is deleted — then cleared immediately (`on delete set null`). Several of those tables (`shops`, `shelters`, `cars`, `routes`, `food_categories`, `distributions`, `food_collections`, `distributions_statistics`, `routes_stops_completions`, among others) have no retention job of their own, so a still-live row keeps its actor indefinitely |

`persons.country` (nationality) is not an Art. 9 category on its own, and the schema has no field for
health, religion or convictions. But `household_notes` and the document upload accept anything a
member of staff decides to put there, so Art. 9 data can enter the system without a single line of
code being wrong — see [G4](#g4-a-hint-now-keeps-special-category-data-out-of-notes-and-documents).

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
  [G3](#g3-the-support-form-now-hints-at-using-the-household-number-instead-of-a-name).
- **Downloads and prints.** The Kundenliste PDF for a distribution carries no names (ticket number,
  household number, person/infant counts only, see §1); the Stammdatenblatt is a household's
  complete master data. Once printed, the application has no further say in either.

## 3. What the code already gets right

Worth recording, because it is the part that does not need work:

- **Authentication and session handling.** Argon2 password hashing, JWT in an `HttpOnly` cookie with
  `Secure` derived from the request (`TafelLoginFilter.createTokenCookie`), stateless sessions,
  CSRF with a session-bound token and `SameSite=Strict`, lockout after repeated failures — per
  username and, since G23, per client IP.
- **A tight public surface.** Exactly two API endpoints are reachable without a session:
  `/api/login` and `/api/config/public` (`WebSecurityConfig.publicEndpoints`); everything else under
  `/api/**` — `/api/logout` included — is `authenticated()`. Paths outside `/api/**` are
  `permitAll()`, which is the static frontend and `/error`; the actuator (`health`, `prometheus`) is
  on the separate management port 8081, which the container never publishes — only the image's own
  healthcheck reaches it.
- **A session ends when it is ended.** The JWT is stateless, but `users.token_invalidated_at`
  (`R__00109`) is bumped on logout and on every password change, and `TafelJwtAuthProvider` rejects
  a token issued before it — so a cookie copied out of a browser does not outlive the logout.
- **No third parties loaded by the application.** The CSP is `'self'` throughout, with no analytics,
  no fonts and no CDN. The only cookies are the JWT and the CSRF token — both strictly necessary, so
  no consent banner is owed and none is present. A staff member can still *click through* to Google
  Maps for a shop's or route stop's address (`maps-url.util.ts`) — a user-initiated navigation away
  from the application, not a resource it loads, and `Referrer-Policy`/`rel="noreferrer"` on those
  links keep the current page's URL from reaching Google.
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

Ordered by how exposed they leave the operator, not by how hard they are to fix. G12 onward are the
exception — appended after the original review rather than re-ranked into it, so the existing G1–G11
numbering (and the issues already filed against it) stays stable.

### G1 A household is now deleted once it has been expired long enough

**Art. 5(1)(e), Art. 17(1)(a).** Personal data must be kept no longer than necessary, and must be
erased once the purpose is gone.

`HouseholdRetentionService` runs nightly and deletes every household whose `valid_until` is further
in the past than `tafeladmin.householdDeletion.retentionTime` (7 years by default — the Austrian
bookkeeping retention period for records touching cost contributions, UGB/BAO Section 132, chosen
as a defensible floor rather than a final legal-basis answer). Deletion goes through the same
`HouseholdService.deleteHouseholdByHouseholdId` a staff member's manual delete uses, which cascades
to persons, documents (removing the files on disk too) and notes, while the database cascades
`distributions_households` on the same delete — so master data, documents and
attendance history are all one retention window rather than three, and the year-end statistics
aggregates (frozen at distribution close, ADR-0020) are unaffected. `tafeladmin.householdDeletion.enabled`
is a kill switch independent of the window, and both are read per use so an operator can change
either on a running deployment.

What remains open: the window is a floor picked without a documented legal-basis decision (see G2).
The job now reports what it is about to delete before it runs, and alerts on failure — see G19.

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

### G3 The support form now hints at using the household number instead of a name

**Art. 5(1)(c), Art. 5(1)(f).**

The exposure this section was originally written for is gone: the form no longer files a public
GitHub issue but mails the request to the deployment's own support addresses
([ADR-0044](adr/0044-support-requests-sent-as-mail.md)), so a helpfully-worded "Bei Kunde Nr. 1234,
Maria Musterfrau, wird das Einkommen falsch gerechnet" no longer becomes world-readable, mirrored
and indexed within seconds.

What was left was ordinary but not nothing: the text is still free text that can name a customer,
and it lands in a mailbox — copied to whatever that mail server and its backups keep, outside
anything this application can delete. The mail also carries the reporter's username, their browser
context (page, user agent, last errors) and **a screenshot of the page the request was written on**,
which on a customer detail screen is that household's name, address and income figures as a picture.
It is always attached — there is deliberately no opt-out — so the control that remains is *where the
reporter is standing* when they open support.

The dialog's hint (`testid="supportHint"`) now says exactly that: report a customer by household
number rather than name, and navigate away from a customer screen first if what is on it should not
travel. The dialog no longer previews the screenshot itself — the preview was a scaled-down copy of
the page the reporter was already looking at, adding no information while pushing the form down on a
small screen; the hint still states that a screenshot is attached.

What remains open: a retention rule on the support mailbox is the operator's to set, not the
application's, and once a request is sent the free text and screenshot are as uncontrolled as any
other mail the organisation receives. The mail's `page` field also carries the current URL verbatim,
query string included — see [G25](#g25-a-search-term-is-a-name-and-it-travels-into-the-access-log-the-url-and-the-support-mail).

### G4 A hint now keeps special-category data out of notes and documents

**Art. 9, Art. 5(1)(c).**

`household_notes.note` is unrestricted free text, and the document upload accepts any file under
`tafeladmin.storage.maxDocumentSize` (25 MB by default). A note reading "kann wegen Physiotherapie
nicht selbst kommen" is health data, and an uploaded Meldezettel or asylum decision carries more than
income. Both then sit in the household file with no special handling, no separate permission, and —
because `HouseholdNoteEntity` is in `AuditScope` — a copy of the previous text in `audit_log` for 30
days. Field-level restriction was never realistic here; a short, visible rule was the smallest useful
step.

The note dialog (`testid="noteHint"`) and the document upload panel (`testid="uploadDocumentHint"`)
now both say, in the customer's own file, to record only what the claim assessment needs and to leave
out health, religion or similarly special-category data — and the Kunden user guide chapter carries
the same rule.

What remains open: this is a visible rule, not an enforced one — nothing in the code stops a member
of staff from typing or uploading special-category data anyway.

### G5 A customer data-subject request can now be answered from the application

**Art. 15, Art. 20.**

`HouseholdExportService` (issue #3179, see [ADR-0051](adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md))
serves one ZIP behind the same `CUSTOMER` permission as the rest of a household's data, from
customer-detail's "Weitere Aktionen" menu: `GET /households/{householdId}/export` — household
(including `prolongedAt` and whether a privacy-notice document is on file), persons, notes (via the
unpaged `HouseholdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc`, so a
page-size cap can't silently truncate the record), each of those three's `updatedBy`, distribution
attendance history and the list of uploaded documents — including the document's linked person and
uploader — as both a PDF and a machine-readable JSON file
([G20](#g20-the-three-gdpr-exports-are-now-machine-readable-too-not-just-pdf), issue #3418), plus
every uploaded document itself. One combined archive rather than several separate downloads: a
data-subject request normally wants "everything you have on me" in one piece.
The endpoint stores nothing; the archive is built on request and never written to disk or a table. It
is recorded in the audit trail as a single `AuditOperation.READ` entry against the household
(G6/#3180), the same way `generatePdf` already was.

What remains open: `audit_log` entries about the household are deliberately excluded from the export —
left as an unanswered permission-boundary question in ADR-0051's consequences rather than folded in by
omission. [G12](#g12-a-staff-data-subject-request-can-now-be-answered-from-the-application), the
same question for staff instead of customers, leaves the same question open for the same reason.

### G6 A small, targeted set of reads is now recorded

**Art. 5(2), Art. 32.**

The audit trail used to record writes only. Opening a household or downloading its ID scans left no
trace — so "did somebody look up their neighbour's income" was a question the system could not
answer, in an organisation where volunteers and the customers can live in the same district.
Auditing every read would be noise for an application this size; the sensitive handful is not.

`AuditOperation.READ` entries are written for exactly that handful, which has grown since the
first version of this section: opening a household's detail view (`HouseholdService.findByHouseholdId`,
issue #3430) and a user account's detail view (`TafelUserDetailsManager.recordUserRead`, #3493) —
both de-duplicated per actor and record within `tafeladmin.audit.readDedupeWindow` (5 minutes) so a
page reload isn't a second entry; document download (`HouseholdDocumentService.getDocumentFile`);
viewing a not-yet-imported scanner file (`DocumentScannerController`); Stammdatenblatt/Ausweis
generation (`HouseholdService.generatePdf`); Kundenliste generation for a distribution
(`DistributionService`); the three data-subject exports (`HouseholdExportService`,
`UserExportService`, `EmployeeExportService`); and reading the audit trail itself — a household's
"Verlauf", a Zugriffsprotokoll search with its filter, and the filter options (`AuditService`,
#3474). They land in the same `audit_log` table and retention window as writes, and show up on the
Zugriffsprotokoll screen and a household's "Verlauf" tab like any other entry.

Deliberately *not* recorded, because a per-row entry would be noise rather than a signal: the
paginated list and search endpoints (`GET /api/households`, `GET /api/users`, `GET /api/employees`,
a household's note and document *lists*), the Datenauskunft search (see G15), and the blank
privacy-notice templates, which carry no subject's data at all. A list shows what the search screen
shows; the trail records the moment someone reaches into one record. The bulk CSV downloads are a
different matter — see [G24](#g24-the-name-bearing-csv-downloads-are-not-recorded-and-not-inventoried).

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

`HouseholdDocumentController`, `DocumentScannerController` and `DocumentScannerSseController` — the
ID scans, proofs of income and the not-yet-imported scanner-folder files behind them, the most
sensitive artefacts the application stores — now require a separate `CUSTOMER_DOCUMENTS` permission
instead (`UserPermissions.kt`), and the customer detail screen's "Dokumente" tab is hidden without
it, the same pattern the "Verlauf" tab already used for `AUDIT_LOG`. See
[ADR-0050](adr/0050-customer-documents-split-into-its-own-permission.md) for the full decision and
its consequences, and issue #3181.

What remains open: `HouseholdController`'s own endpoints (household master data, income, cost
contribution) are still behind the single broader `CUSTOMER`, and — unchanged by this — nobody has
written down who holds `CUSTOMER` or `CUSTOMER_DOCUMENTS` today and why; that write-up is the
operator's, tracked with the rest of [§6](#6-what-this-repository-cannot-answer) in #3185.
[G6](#g6-a-small-targeted-set-of-reads-is-now-recorded) now traces who actually read a document or
generated a Stammdatenblatt; this gap only ever limited who could.

### G8 Encryption at rest is now confirmed with the operator

**Art. 32(1)(a).**

Uploaded documents are written as plain files under `<documentsPath>/<householdId>/<uuid>_<name>`,
and the database columns are plain text — a normal design, since encryption at rest is expected to
come from the volume and the database host rather than the application. What was missing was
evidence that it actually does: [ADR-0021](adr/0021-documents-on-a-volume-metadata-in-the-database.md)
put the backup obligation on the operator without settling encryption, and the per-household
directory layout would make a copied volume trivially browsable by household number if it were not.

The operator confirmed ([#3182](https://github.com/wrk-tafel/admin/issues/3182)) that the documents
volume, the database volume and their backups are on encrypted storage at the infrastructure level.
ADR-0021's consequences record that answer.

### G9 The access log's lack of rotation is now a deliberate, documented operator hand-off

**Art. 5(1)(e).**

`server.tomcat.accesslog.rotate: false` in `application.yml` means `logs/access.log` is a single file
that grows for the life of the deployment, holding one line per request — including every
`/api/households/{id}` path, i.e. a permanent record of which case files were opened when, from
which address as the container sees it. This was the one store in the system with no bound at all,
and unlike the audit trail nobody had chosen it: it was a default nobody had revisited.

Before [G6](#g6-a-small-targeted-set-of-reads-is-now-recorded), this was also the closest thing to a
read log that existed — an accident rather than a control, since it was neither queryable nor
scoped. `audit_log` is now the real, scoped read log, which changes what `access.log` is *for*: not
the record of who read what, but Tomcat's own request trace, which is why the answer settled on is
host-side rotation rather than an in-application one — `application.yml`'s `rotate: false` now carries
a comment saying so explicitly, so the setting reads as a decision instead of an oversight the next
time someone finds it. `app.log`'s own rollover (Spring Boot's logback defaults — 10MB per file, 7
files, 100MB total cap) is likewise made explicit rather than left as whatever the framework happens
to default to.

What remains open: the retention this hand-off relies on lives in the deployment host's own logrotate
configuration, outside this repository — and what the file *contains* turned out to be more than
paths, see [G25](#g25-a-search-term-is-a-name-and-it-travels-into-the-access-log-the-url-and-the-support-mail) — the same operator-side gap [§6](#6-what-this-repository-cannot-answer)
already tracks for backups and processor agreements.

### G10 Copies survive an erasure, and nobody can say for how long

**Art. 17(1), Art. 19.**

Deleting a household is thorough in the database, but copies outlive it: `audit_log` entries for up
to 30 days (deliberate, and documented in ADR-0039), `sse_outbox` payloads for 14, `mail_outbox`
rows — the composed mails, attachments included — for 14 after they were sent (ADR-0041) or 30 after
they were queued if delivery was given up on (ADR-0046), any Kundenliste PDF already printed or
mailed, and every backup made before the deletion. Restoring a backup re-creates erased people, and
nothing propagates the erasure into it.

Almost every copy inside the application now has a clock on it, which was not true of a
`mail_outbox` row parked as `FAILED`: it kept its full MIME message — report PDF or support
screenshot included — until somebody removed the row by hand, which no screen ever prompted anyone to
do (ADR-0046). One exception still runs past 30 days, and is documented as such rather than folded
into that figure: deleting a *user* account's linked `employees` row can take up to 7 years if that
employee is still referenced elsewhere (household issuer, note author, food collection driver, route
stop completion recorder — see [G13](#g13-a-system-user-or-employee-account-now-expires-too-mirroring-g1)).
A household's `household_duplicate_dismissals` rows (a reviewer's "kein Duplikat" verdict against
another household, holding only the two household numbers) go with the household itself:
`R__00110_household_duplicate_dismissals_fk.sql` cascades both foreign keys on delete.

The actual erasure timeline is now written down where an administrator handling a request reads it —
`docs/userguide/datenauskunft.md`'s "Technische Spuren nach der Löschung" section, including the
exception above — instead of only existing spread across ADRs, so a request can be answered honestly
rather than with a single blanket figure.

What is left is outside the application: a printed or mailed PDF, and the operator's backups. How a
backup restore is followed by a re-run of pending deletions is an operator decision this repository
cannot make on its own — see [§6](#6-what-this-repository-cannot-answer) and
[#3185](https://github.com/wrk-tafel/admin/issues/3185).

### G11 A fixed threshold now flags excessive read access

**Art. 33, Art. 32(1)(d).**

The only security signal the application used to produce was the lockout push after repeated failed
logins (`UserLockedOutPushListener`). Nothing noticed or reported a session downloading every
document in sequence, an export run at an odd hour, or a database dump. With no read log
([G6](#g6-a-small-targeted-set-of-reads-is-now-recorded)), a breach that used a legitimate account
would have left nothing behind to detect or reconstruct — which also made the 72-hour notification
duty impossible to discharge with any accuracy.

`ExcessiveReadAccessDetectionService` (`modules/push/internal`) now runs hourly
(`tafeladmin.audit.breachDetectionCron`, under a ShedLock) and pushes a
notification to administrators when one user's `AuditOperation.READ` count in the trailing hour
exceeds `tafeladmin.audit.breachDetection.readThreshold` (default 20; 0 or less switches the check
off). Deliberately just a fixed
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

`UserExportService` (issue #3363, see [ADR-0051](adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md))
serves a ZIP - a PDF via the same `PDFService`/XSL-FO pipeline as the household export, plus a
machine-readable JSON file
([G20](#g20-the-three-gdpr-exports-are-now-machine-readable-too-not-just-pdf), issue #3418) - with
master data (username, employee personnel number/name, `enabled`, account creation date, `lastLogin`,
whether push notifications are enabled), every assigned permission (with when and by whom it was
granted), registered push devices, any push-notification-type opt-outs, the current failed-login
state (`login_attempts`) and the login history of the retention window (see below). Never the
password hash. Recorded in the audit trail as a single `AuditOperation.READ` entry against the user
(G6/#3180), the same way G5's export is. Reachable two ways: `GET /api/users/export` behind
`isAuthenticated()` (matching `/api/users/info`'s self-only pattern), from the user menu's "Meine
Daten exportieren" entry; and `GET /api/users/{userId}/export` behind `USER_MANAGEMENT`, from a
user's detail screen's "Daten exportieren (ZIP)" button, for a request made on someone's behalf.

Added alongside [#3362](https://github.com/wrk-tafel/admin/issues/3362), which asked for a takeout
plan covering "either customers or internal employees" — the original review (#3124) only considered
the customer side.

What remains open: same as G5, `audit_log` entries *about* the user (a household they issued, a note
they authored, a food collection they drove) are still excluded — left as an unanswered
permission-boundary question in ADR-0051's consequences. Settled, not open: `audit_log`'s
`UserLogin`-typed entries are the one exception (issue #3446) — a login event's subject and actor are
the same person, so unlike the rest of the trail it is this user's own data rather than another
record's, and the export now includes it (`buildLoginRows`, retention-bounded the same way the
Zugriffsprotokoll screen is). The export also does not follow references *into* other tables either -
a household this person issued, a note they authored, a food collection they drove - since that data
is substantively the referenced record's own, with this person's name attached only as attribution.
See ADR-0051's "Scope stays per-area" decision.

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
  endpoint uses, and defaults to 7 years - unified with `householdDeletion.retentionTime` and
  `employeeDeletion.retentionTime` as one consistent retention floor across the application, even
  though unlike `householdDeletion.retentionTime` (a bookkeeping-law period) there is no single
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
  `householdDeletion.retentionTime`, even though an employee this job ever actually reaches is, by
  definition, not the issuer/driver/recorder of anything still on record, so no bookkeeping period
  specifically applies to it.

Both jobs are configurable and switchable per deployment
(`tafeladmin.userDeletion.*`/`tafeladmin.employeeDeletion.*`, read per use), run nightly after
`HouseholdRetentionService` (06:00) at 06:15/06:30, and claim their candidates with `FOR UPDATE SKIP
LOCKED` (ADR-0047) the same way G1 does. What remains open, same as G1: both windows are floors picked
without a documented legal-basis decision (see G2). Both jobs now report what they are about to
delete before they run, and alert on failure — see G19.

### G14 An employee with no user account can now be exported too, closing a gap G12 left open

**Art. 15, Art. 20.** G12's own export assumed every staff member has a `users` row to key off of -
but `EmployeeEntity` (personnel number, first/last name) can exist entirely on its own, referenced as
a household's issuer, a household note's author, or a food collection's driver/co-driver, with nobody
ever logging in as them (someone who only drives for a route, say). For that person there was no
export path at all: not self-service (no account to authenticate with), and not admin-triggered
either, since `UserController.exportUserById` is keyed by a `userId` such an employee never has, and
the Mitarbeiter settings screen (`SettingsEmployeesComponent`) had no detail view to hang an export
action off of.

Found while implementing G12 (issue #3394). `EmployeeExportService` closes it with a ZIP - a PDF via
the same `PDFService`/XSL-FO pipeline as G12's own export, plus a machine-readable JSON file
([G20](#g20-the-three-gdpr-exports-are-now-machine-readable-too-not-just-pdf), issue #3418) - master
data only (personnel number, name, created date) - an `EmployeeEntity` holds nothing else, so there
is no permissions table the way G12's export has one. Recorded in the audit trail as a single
`AuditOperation.READ` entry (G6/#3180), the same way G5's and G12's exports are, sharing its
`AuditScope` entity type with the insert/update/delete entries `EmployeeEntity`'s own writes produce.
Reachable from `GET /api/employees/{employeeId}/export`, an export action in the Mitarbeiter table's
row actions, behind `SETTINGS` rather than `USER_MANAGEMENT` - the permission `EmployeeController`
itself already requires, since there is no self-service angle for an employee with no account of
their own.

Refuses (409) an employee a `users` row already references - one person is meant to have exactly one
takeout document, and `UserExportService`'s own master data already carries the linked employee's
personnel number and name, so a second, less complete document here would be a duplicate rather than
a second useful export. The frontend hides the button for exactly that case, and the linked account's
own detail page is where the complete export for that person already lives.

What remains open: same as G5/G12, `audit_log` entries about the employee are excluded from the
export. Settled, not open, same as G12: this export is master data about the employee themselves
only - it does not follow the reverse references above (issuer/author/driver) back into the
household, note or food collection rows that name them, since those rows are substantively that
other record's own data. See ADR-0051's "Scope stays per-area" decision.

### G15 A central screen now ties the three GDPR exports together, and can erase what it finds too

**Art. 15, Art. 17, Art. 20.** G5/G12/G14 each answer "what do you have on this person" for one of
three separate categories (customer, staff with an account, staff without one) - but a real
data-subject request doesn't arrive pre-labelled with which category the requester falls into, and
answering it meant guessing, then navigating three different screens under three different
permissions (`CUSTOMER`, `USER_MANAGEMENT`, `SETTINGS`), then manually combining two downloads by
hand for someone who is both a customer and a volunteer.

`DataSubjectRequestController`/`DataSubjectRequestService` (issue #3396) close that with one search
box across `households`, `users` and `employees` (reusing `SearchTextSpecs`'s trigram search for the
first two, the Mitarbeiter screen's own `findBySearchInput` for the third, filtered to exclude an
employee already covered by G14's own refusal), grouped by which of the three areas each match is.
Export and delete both trigger the existing per-area service through a thin cross-module facade
(`HouseholdDataSubjectFacade`/`EmployeeDataSubjectFacade` - Spring Modulith never exposes an
`.internal` type across a module boundary, named interface or not) rather than a new pipeline:
exporting one or more selected matches always returns one ZIP (each area's own export - itself
already a ZIP, see [G20](#g20-the-three-gdpr-exports-are-now-machine-readable-too-not-just-pdf) -
unpacked into its own `kunde-<id>`/`benutzerkonto-<id>`/`mitarbeiter-<id>` folder, so a customer and
a staff match selected together - the same person, holding both - come back as one archive);
deleting runs per match independently since, unlike export, two unrelated records failing together
would be a worse experience than one of them simply staying (`DataSubjectDeleteResultItem` reports
`DELETED`/`NOT_FOUND` per match, not a single pass/fail).

Behind a new `DATA_SUBJECT_REQUESTS` permission, additive rather than a replacement: holding it only
grants reaching the search and picking a match - the search itself only returns matches from an area
the caller also holds the area permission for, and the export/delete action on a specific match still
requires that same permission (`CUSTOMER`/`USER_MANAGEMENT`/`SETTINGS`), enforced again inside
`DataSubjectRequestService` since the class-level `@PreAuthorize` alone can't express a check that
depends on which area a search result or a request body names. This is the permission-model question
the takeout design's alternatives left for "the future ticket to confirm" (ADR-0051) - answered here as additive so today's
screens keep meaning what they already meant, rather than `DATA_SUBJECT_REQUESTS` alone becoming a
fourth way to reach the same data.

Deletion reuses `HouseholdService.deleteHouseholdByHouseholdId`, `EmployeeService.deleteEmployee` and
a new `TafelUserDetailsManager.deleteUserById` (the same "keep at least one active administrator"
guard `UserController.deleteUser` already enforces, re-checked here since this is a second caller of
`deleteUser` that must not bypass it) - no new erasure logic, matching §6's own prediction that
household erasure (and now staff erasure) "already exists in part" for a future feature to reuse.
One exception: a `USER_ACCOUNT` match's deletion also deletes the linked `employees` row once it's
no longer referenced by anything other than the just-deleted `users` row itself (issue #3423) -
`UserEntity.employee` deliberately isn't cascade-`REMOVE`d (see its KDoc), so without this a staff
erasure would otherwise leave personnel number and name behind until `EmployeeRetentionService`'s
own age-gated sweep, up to `tafeladmin.employeeDeletion.retentionTime` (7 years by default) later -
too long for an Art. 17 request. An employee still referenced elsewhere (household issuer, note
author, food collection driver/co-driver, route stop completion) is left alone, same as that sweep,
since those are still-live records rather than abandoned personal data.

No separate audit entry for the search itself - only the eventual export/delete stays audited, the
same as before (§5's `AuditOperation.READ`/writes tracked per entity, not per screen).

What remains open: same as G5/G12/G14, `audit_log` entries about the matched record stay excluded from
the export - except a `USER_ACCOUNT` match's own login history, which is included because it delegates
to G12's `UserExportService` unchanged (see G12's "What remains open" for why that one entity type is
different). The search itself caps at 20 best matches per area (a lookup for one specific person, not
a report), and a search that hit that cap in any area comes back with `truncated: true` so the screen
can tell the caller to narrow the search rather than trust an incomplete list silently.

### G16 A document upload is now checked against what the file actually is, not just its declared type

**Art. 32(1)(b).** `HouseholdDocumentService`'s allow-list of `application/pdf`, `image/jpeg`,
`image/png` was only ever checked against the `Content-Type` the caller declared - for a browser
upload, that is the client's own claim, with nothing behind it confirming the bytes sent actually
match. The scanner-import path derived its content type from the file extension instead
(`ScannerFileService.resolveContentType`), which the browser path did not check at all, and neither
path looked at the file's own content.

`validateContentType` now checks three things for every upload, browser and scanner-import alike:
the declared/resolved content type is still allow-listed, the file name's extension matches that
content type (`ALLOWED_EXTENSIONS_BY_CONTENT_TYPE`), and the file's own magic bytes match it too
(`%PDF`, the JPEG `FF D8 FF` marker, the PNG signature) - so a renamed file, or a browser sending a
content type that doesn't match what it actually uploaded, is rejected with the same 400 the size
check already used, on both paths.

What remains open: no malware scanning exists anywhere in either upload path. Running something like
ClamAV over an uploaded ID scan or proof of income is an infrastructure decision with its own cost
and failure modes (a scan daemon to run and keep signatures current, a slower upload path, a rejected
false positive), and this repository cannot make that call - it is the operator's risk decision to
take and record, not a gap this fix closes.

### G17 A deleted account's username no longer outlives it on every other table

**Art. 17(1).** `created_by`/`updated_by` (`R__00092_change_tracking_actor.sql:5-7,20-49`, plus
`R__00096`/`R__00102`) were plain `varchar` columns holding the acting user's username, with no
foreign key to `users(id)` - the value had to stay readable after the account was renamed or
deleted, and an audit value that cascades away is worthless. But on a table with no retention of its
own (`shops`, `shelters`, `cars`, `routes`, `food_categories`, `distributions`, `food_collections`,
`distributions_statistics` among others), that also meant a deleted account's username stayed in the
database forever, past the point the account itself was gone.

`R__00111_change_tracking_actor_user_fk.sql` (issue #3426, [ADR-0052](adr/0052-change-tracking-actor-becomes-a-foreign-key.md))
closes that from the other direction: both columns are now a nullable foreign key to `users(id)`
with `on delete set null`, the same pattern `R__00106_employee_delete_set_null.sql` already used for
`employee_id` references. Deleting an account clears every row it touched by itself, at the database
level, the same moment the account row goes - there is no sweep left for the application to run, so
every caller of `TafelUserDetailsManager.deleteUser` (`UserController.deleteUser`, `deleteUserById`
via G15's data-subject-request delete, and G13's `UserRetentionService`) is covered without having
to remember to call anything extra.

Two usernames are still stored as plain text, both bounded and both on purpose: `audit_log`'s
`actor_username`/`actor_firstname`/`actor_lastname` (`R__00093`/`R__00094`) are denormalised so an
entry keeps saying who acted after the account is gone — for the trail's own 30-day retention, not
longer — and `login_attempts.username` holds whatever was typed at the login form, cleaned hourly.

### G18 The scanner share now expires files too, with a warning before it does

**Art. 5(1)(e).** Files on `tafeladmin.storage.scannerPath` - scanned ID documents not yet imported
or discarded - stayed until a user imported or deleted them by hand, with no bound of any kind. A
scan nobody claims is personal data with no retention window, the same gap G1 closed for households.

`ScannerFileCleanupService` (`household`, nightly at 05:05) deletes any file older than
`tafeladmin.storage.scannerFileRetention` (7 days by default). Unlike an already-imported document,
a scanner file has no database row to reconcile against - `ScannerFileService` only ever
lists/reads/deletes the folder directly - so the job only ever needs a file's own last-modified
timestamp, the same signal the picker already showed staff (`ScannerFileItem.modifiedAt`).

`ScannerFileExpiryReminderService` (`push`, daily) warns before that job deletes anything: once a
file is within `tafeladmin.storage.scannerFileRetentionWarning` (1 day by default) of the deadline,
subscribed devices with the `CUSTOMER_DOCUMENTS` permission get a push notification, repeating every
day the file stays unclaimed - giving staff a real chance to import or discard it deliberately
before the cleanup job does it for them. The two jobs read the same share independently rather than
one publishing an event for the other, the same ambient-config-and-filesystem access
`DistributionStillOpenReminderService`/`ExcessiveReadAccessDetectionService` already use for their
own checks - so `household` gains no dependency on `push` and vice versa.

### G19 A retention job now reports itself instead of only logging one aggregate line

**Art. 5(1)(e), Art. 32.** Storage limitation is only as trustworthy as the process enforcing it: a
job that throws is invisible unless someone happens to read `app.log`, and a misconfigured window
that deletes far more than intended looks identical to a normal night from the outside.

`HouseholdRetentionService` (G1), `UserRetentionService`/`EmployeeRetentionService` (G13) and
`AuditRetentionService` each wrap their run in a try/catch and publish a `RetentionRunAlertEvent`
(`common/retention`) on two conditions: the run threw, or it would have deleted more rows than a new
per-job ceiling (`tafeladmin.{householdDeletion,userDeletion,employeeDeletion,audit}.maxDeletionsPerRun`,
read per use, 0 or less switches the ceiling off) — refusing to delete anything that run rather than
proceeding. `push`'s `RetentionRunPushListener` turns either into a `RETENTION_RUN` broadcast to
`ADMINISTRATOR`-permission users, mirroring how `ExcessiveReadAccessDetectionService` (G11) already
alerts on a fixed threshold, and `ScannerFileExpiryReminderService` (G18) already warns before its
own deletion job runs. An ordinary successful run is deliberately *not* alerted on — only a failure
or a refused run is worth an interruption. The event type lives in the ambient `common.retention`
package rather than inside a module, the same reasoning as `common.auth.model.UserLockedOutEvent`:
`household` and `base::employee` are real Spring Modulith modules with their own restricted
`allowedDependencies`, and an ambient event needs no dependency declaration to be published or
listened for (see `push`'s `package-info.java`).

Deletions themselves stay visible before they happen too: the customer search screen's "Wird in den
nächsten 30 Tagen gelöscht" filter chip (`HouseholdEntity.Specs.willBeDeletedSoon`) previews which
households `HouseholdRetentionService` will sweep within the next 30 days, at the job's own
`retentionTime` cutoff — the same way `missingPrivacyNoticeDocument` (G2) already previews a
different upcoming gap.

`AuditRetentionService` additionally gets `tafeladmin.audit.cleanupEnabled` — a kill switch for
*deletion*, independent of `tafeladmin.audit.enabled` (which only ever gates *writing*, see
`AuditLogWriter`) and of `retentionDays` itself. Before this existed, the only way to pause deletion
was `retentionDays <= 0`, indistinguishable from an operator who simply hasn't configured a window
yet — the fail-safe direction for that ambiguity was "keep forever", the opposite of every other
retention job here, which all default their kill switch to *on* and gate on a separate, explicit
window value.

What remains open: the ceilings are fixed defaults an operator has to actively tune per deployment
size, same caveat as G11's read-access threshold; and the alert only ever reaches someone already
holding `ADMINISTRATOR` and push notifications on their device.

### G20 The three GDPR exports are now machine-readable too, not just PDF

**Art. 20.** Found in a re-audit of the code against this document (2026-08-27), independent of the
original G5/G12/G14 reviews. Art. 15 ("access") was satisfied by a PDF; Art. 20 ("data portability")
additionally requires a "structured, commonly used and machine-readable format", which a PDF - laid
out for a human to read, with German labels and locale-formatted currency - is not, strictly read.

All three exports (`HouseholdExportService`, `UserExportService`, `EmployeeExportService`) already
built their PDF from a plain Kotlin object tree (`HouseholdExportPdfData`/`UserExportPdfData`/
`EmployeeExportPdfData`) before handing it to the XSL-FO pipeline, so issue #3418 added a
same-shaped JSON sibling (`HouseholdExportJsonData`/`UserExportJsonData`/`EmployeeExportJsonData` -
every field but the logo, serialised as-is via `tools.jackson.databind.json.JsonMapper`) rather than
a new export path. `HouseholdExportService`'s export was already a ZIP, so this only meant adding a
`daten.json` entry alongside `datenexport.pdf`. `UserExportService`/`EmployeeExportService` previously
returned a bare PDF; both now return a ZIP the same shape as the household export's, and their
controllers (`UserController`, `EmployeeController`) serve `application/zip` instead of
`application/pdf`. [G15](#g15-a-central-screen-now-ties-the-three-gdpr-exports-together-and-can-erase-what-it-finds-too)'s
combined `datenauskunft.zip` needed no change: it already unpacked a nested ZIP's entries flat into
the match's own folder, so a user's/employee's export unpacks the same way a household's already did.

What remains open: nothing new - this closes a gap in G5/G12/G14 without opening one of its own.

### G21 A household note can now be corrected or erased, not only appended

**Art. 16, Art. 17.**

`HouseholdNoteController` used to expose only `GET` (list) and `POST` (create). A note with a
factual error, or one that captured special-category data despite the G4 hint, could not be
corrected or removed except by deleting the whole household — the sharpest Art. 16 gap in the
application, and the one that made G4's residual risk unremediable: the hint mitigates entry, but
there was no path back once something was in.

`PUT /api/households/{householdId}/notes/{noteId}` and `DELETE .../{noteId}` are now both behind
`CUSTOMER`, scoped by `findByIdAndHouseholdHouseholdId` the same way document access already is —
a note ID from a different household 404s rather than leaking or editing across households — and
further restricted to the note's own author, so staff can correct or erase what they wrote
themselves but not each other's notes.
`HouseholdNoteEntity` was already in `AuditScope`, so the correction/deletion itself lands in the
audit trail for free, the same as any other write. The "Alle Notizen anzeigen" dialog (now offered
from a single note onward, not only once there are several) gets a pencil and a bin per note on the
current user's own notes, the bin behind its own confirmation dialog.

What remains open: nothing new — this closes the gap G4 left open rather than opening one of its
own.

### G22 Staff now get an Art. 13 notice too, and the customer notice's own gaps are closed

**Art. 13.** A privacy notice must cover recipients, third-country transfers, the consequences of
not providing data, and whether Art. 22 automated decision-making applies - not just controller,
purpose, legal basis, retention and rights.

Found in a re-audit of G2 (issue #3429): the customer notice (`pdf-templates/customer-pdf/includes/
privacy-notice.xsl`) had controller, DPO, purpose, legal basis, retention and rights, but no
recipients/categories of recipients, no third-country statement, no mandatory/voluntary-with-
consequences paragraph and no Art. 13(2)(f) line - and its "7 Jahre" retention figure was
hard-coded text rather than `tafeladmin.householdDeletion.retentionTime`, so an operator changing
the property silently desynchronised the printed sheet from what the application actually does.
Staff (`users`/`employees`) had no Art. 13 notice anywhere - an export (G12/G14) and a retention job
(G13) exist, but nobody is *informed*, the "informed" half of the same obligation the customer
notice answers.

Both are closed the same way as G2 originally was, by the same reasoning and with the same caveat:

- The customer notice's `retentionText`, and the new `generatedAt` footer stamp below, are now
  passed into the template as parameters (`HouseholdPdfService`, `PrivacyNoticePdfData`) instead of
  being literal text, so both are read from the live configuration at generation time rather than
  frozen at the point someone last edited the XSL.
- The four missing paragraphs (recipients, third-country transfer, mandatory/voluntary and
  consequences, no Art. 22 automated decision-making) are added to the customer notice, grounded in
  what [§1](#1-what-personal-data-the-application-holds)/[§2](#2-where-personal-data-leaves-the-system)/[§5](#5-checked-and-found-fine)
  of this document record the application actually does (hosting and mail-sending processors, no
  customer data reaching a third country, `IncomeValidatorService` never deciding on its own).
- A new one-page staff notice (`pdf-templates/staff-pdf/`, `StaffPrivacyNoticeService`) covers the
  same ground for `users`/`employees`/push subscriptions - including the one *real* third-country
  transfer in this application, Web Push's device endpoints at Google/Mozilla/Apple (see
  [§2](#2-where-personal-data-leaves-the-system)). Generic and reference-less, the same shape as the
  customer notice's own blank counterpart (no household/user/employee to look up, so nothing here is
  audited or wrapped in a transaction): reachable from the user menu for self-service
  (`GET /api/users/privacy-notice-template`, `isAuthenticated()` only) and from the Mitarbeiter
  settings screen for an admin to hand it to someone with no account of their own.
- Both documents' `retentionTime` text is read per generation, same as the
  retention jobs themselves read it - an operator's config change is reflected the next time either
  PDF is generated, with no restart needed.
- Both documents now carry a page-number-and-generation-date footer (`fo:static-content` bound to
  `xsl-region-after`, the same pattern `household-export`/`user-export`/`employee-export` already
  use) - the fuller disclosure set no longer fits on one page for either document, and a stray page
  found later needs the date to be matched back to the right printing.

What remains open, same as G2's own "what remains open": this was drafted against what the codebase
and [§1](#1-what-personal-data-the-application-holds)/[§2](#2-where-personal-data-leaves-the-system)
of this document record, not routed through a documented legal/DPO sign-off process, and nothing in
the application tracks *whether* that sign-off happened - see issue #3185. A closer question G2
never had to answer: **fixing the hard-coded retention text only helps a notice generated from now
on** - a customer notice already signed and filed as a scanned PDF (`DocumentType.PRIVACY_NOTICE`)
is a snapshot of what was printed at intake, the same as any signed paper document, and stays that
way if the operator later changes the retention window. Whether that ever needs a re-notification or
re-consent step is a question for the operator/DPO, not something either the original hard-coded
text or this fix could have answered - tracked as [issue #3496](https://github.com/wrk-tafel/admin/issues/3496)
since it surfaced only while fixing this gap, not something #3429 itself asked for.

### G23 Login is now rate-limited and IP-lockout-protected, and no longer confirms which accounts are locked

**Art. 32.** Neither `/api/login` nor `/api/support` had any request-rate defence: `LoginAttemptService`
locks a *username* after repeated failures, but nothing stopped one IP from spraying failed logins
across many different usernames at ~120 guesses/hour/account each, indefinitely, and nothing bounded
how often the same IP could queue an authenticated `/api/support` request either (up to a 3 MB mail
per call).

`RateLimitFilter`, registered in `WebSecurityConfig` in front of both endpoints, now rejects a request
with `429` once `RateLimiterIpService` (a Bucket4j token bucket per `(scope, ip)`) says the calling IP
has spent its budget for that endpoint (`security.rateLimit`, capacity/refill both
configurable, 30 requests/minute by default) - `/api/login` and `/api/support` get independent budgets
per IP, so exhausting one never blocks the other. Unlike `login_attempts`, this counts every request
(not just failures) and lives only in the process's own memory rather than the database: blunting a
single IP's request rate needs no cross-instance coordination, so a small servlet filter checking
`request.remoteAddr` (trustworthy here since `server.forward-headers-strategy: framework` is already
set) is enough.

The rest of the originating issue's findings (tracked separately in
[#3484](https://github.com/wrk-tafel/admin/issues/3484)) are closed alongside this one:

- **`login_attempts` staying username-only, with no IP dimension.** `LoginAttemptIpService` now locks
  out an IP itself (`login_attempts_ip`, mirroring `login_attempts`) after
  `security.loginAttemptsIp.maxFailures` (30 by default, well above the per-username
  threshold) failed logins across however many different usernames were tried from it -
  `TafelLoginProvider.authenticate` checks and records both dimensions, reading the calling IP off the
  `WebAuthenticationDetails` Spring's login filter already attaches to the authentication request.
- **The 423-vs-403 lockout oracle.** `TafelLoginFilter.unsuccessfulAuthentication` no longer
  special-cases `LockedException` - every failed login, whether from wrong credentials or a lockout,
  now answers with the same `403` a caller can't tell apart, trading the login page's old "account
  locked, try again in N minutes" message for not confirming which usernames/IPs are already locked
  out. `PublicConfigResponse.accountLockoutDurationInSeconds` is gone with it - nothing reads a lockout
  duration before login anymore.
- **No character-class requirement for a user-chosen password.** `WebSecurityConfig.passwordValidator`
  now runs a `CharacterCharacteristicsRule` requiring the same lowercase/uppercase/digit mix a
  generated password is already built from (`generatedPasswordCharactersRules`), so a user-chosen
  password can no longer fall below what one guarantees.

### G24 The name-bearing CSV downloads are not recorded, and not inventoried

**Art. 5(2), Art. 32, Art. 33.** Found in a re-audit of the code against this document (2026-08-29),
issue [#3507](https://github.com/wrk-tafel/admin/issues/3507).

Two CSV downloads list households row by row with name and address —
`HouseholdService.generateAboveLimitCsv` (Nr., name, address, income total, limit) and
`generateHouseholdsOverviewCsv` (name, address, persons, validity) — and the JSON lists behind them
(`/above-limit`, `/overview`), `/duplicates` and `/{id}/merge-preview` embed the full household
record per row. None of them writes an `AuditOperation.READ`. [G6](#g6-a-small-targeted-set-of-reads-is-now-recorded)
records the moment someone reaches into *one* record, and [G11](#g11-a-fixed-threshold-now-flags-excessive-read-access)
counts those — so one request that pulls every household above the limit, or every household renewed
this month, into a file is invisible to both, which is the exact shape of a bulk extraction the read
log exists to catch. Until this re-audit, §1 also claimed the only CSVs were aggregates and the
name-less Kundenliste.

What to do: one `READ` per bulk download (entity type per report, business key the filter — the same
shape `AuditService.search` uses for a Zugriffsprotokoll query), counted in the breach detection with
more weight than a single detail view, not less.

### G25 A search term is a name, and it travels into the access log, the URL and the support mail

**Art. 5(1)(c), Art. 5(1)(e), Art. 32.** Found in the same re-audit, issue
[#3506](https://github.com/wrk-tafel/admin/issues/3506).

The customer, user, employee and Datenauskunft searches all send the free-text query as a `GET`
query parameter (`?searchInput=...`), and a search term is, in practice, a customer's name. It then
lands in three places this document described as name-free: `logs/access.log`, whose Tomcat default
pattern logs the full request line, query string included, into the one file that is never rotated
([G9](#g9-the-access-logs-lack-of-rotation-is-now-a-deliberate-documented-operator-hand-off) settled
*where* it is kept, not *what* it holds); the browser's history, because the search screens mirror
the term into the SPA URL and "Kunden anlegen" from an empty search carries `?vorname=&nachname=`;
and the support mail, whose `page` field is `window.location.href` verbatim — so a name in the search
box reaches `mail_outbox` and the support mailbox from a direction [G3](#g3-the-support-form-now-hints-at-using-the-household-number-instead-of-a-name)'s
hint cannot cover.

What to do, smallest first: an access-log pattern without the query string, which also covers any
future parameter; strip the query from the support context's `page` before it leaves the browser;
then decide whether a search term belongs in the URL at all.

### G26 Three report permissions reach the whole household record without CUSTOMER

**Art. 25, Art. 32.** Found in the same re-audit, issue
[#3508](https://github.com/wrk-tafel/admin/issues/3508).

`/above-limit`, `/overview`, `/duplicates` and the merge endpoints require only
`CUSTOMERS_ABOVE_LIMIT`, `CUSTOMERS_OVERVIEW` or `CUSTOMER_DUPLICATES` — but their responses embed
the complete `HouseholdResponse`, every person's birth date, nationality, employer and income
included. The frontend gates the whole `kunden` subtree on `CUSTOMER`, so no screen shows this; the
API does not, so an account holding only one of those three can read every household through it.
`UserPermissions.kt` never declares them additive to `CUSTOMER` the way it does for
`DATA_SUBJECT_REQUESTS` ([G15](#g15-a-central-screen-now-ties-the-three-gdpr-exports-together-and-can-erase-what-it-finds-too)),
and [G7](#g7-the-documents-tab-now-requires-its-own-permission-separate-from-customer) went the
other way for documents.

What to do: either enforce the additivity the frontend already assumes (`CUSTOMER and
CUSTOMERS_ABOVE_LIMIT`, server-side), or return only what each report screen shows.

### G27 The notices omit the IP address (staff) and the audit trail (customers)

**Art. 13(1)(c), Art. 13(2)(a).** Found in the same re-audit, issue
[#3509](https://github.com/wrk-tafel/admin/issues/3509).

[G22](#g22-staff-now-get-an-art-13-notice-too-and-the-customer-notices-own-gaps-are-closed) completed
both notices against what §1 recorded at the time — and §1 was itself incomplete. The staff notice
lists master data, permissions, login timestamps and push devices, but not that the client IP address
is stored on failed logins (`login_attempts_ip`, [G23](#g23-login-is-now-rate-limited-and-ip-lockout-protected-and-no-longer-confirms-which-accounts-are-locked))
and counted in memory for rate limiting — a category that applies to anyone who reaches the login
endpoint. The customer notice never mentions the audit trail: that before/after copies of name,
address and income are kept for `tafeladmin.audit.retentionDays` after every change, and that reads
of the record are logged ([G6](#g6-a-small-targeted-set-of-reads-is-now-recorded)). Both figures
belong in the template as parameters read from the live configuration, the way `retentionText`
already is.

### G28 Two smaller confidentiality leaks: opportunistic SMTP TLS, and a mail subject on a lock screen

**Art. 32(1)(a), Art. 5(1)(c).** Found in the same re-audit, issues
[#3510](https://github.com/wrk-tafel/admin/issues/3510) and
[#3511](https://github.com/wrk-tafel/admin/issues/3511).

`spring.mail`'s `starttls.enable: true` without `starttls.required: true` was opportunistic: a relay
that does not offer STARTTLS — or a path that strips the capability — got the report PDFs and the
support screenshots in plaintext. `starttls.required: true` closes this (#3510); a relay without TLS
now parks every mail as `FAILED` (visibly, per ADR-0046) instead of sending it in the clear —
`application-local.yml` overrides it back to `false` for the local Mailpit container, which has no
TLS cert configured.

The other half is closed too: `MailDeliveryFailedPushListener` used to name a failed mail by its
*subject* in the push body, and a support request's subject is the reporter's own title — which
[G3](#g3-the-support-form-now-hints-at-using-the-household-number-instead-of-a-name) already accepts
may hold a customer's name; the payload is encrypted for the push provider, but the notification is
rendered on administrators' lock screens. It now names the mail by its type and the outbox row's id
instead (e.g. "Support-Anfrage #123 konnte nicht versendet werden"), which `mail_outbox` carries as
its new `mail_type` column ([#3511](https://github.com/wrk-tafel/admin/issues/3511)).

### G29 A signed privacy notice can now be flagged when its printed retention figure has drifted from the live config

Follow-up from G22's own "what remains open" (issue #3500): a customer notice already signed and
filed as a `DocumentType.PRIVACY_NOTICE` document is a snapshot of the retention figure that was
live when it was printed - nothing propagated a later `tafeladmin.householdDeletion.retentionTime`
change into it. There is still no operator/DPO answer to what such a drift should trigger (re-notify,
re-collect a signature, or simply accept the printed sheet as stale text on an otherwise-valid
consent) - see [issue #3496](https://github.com/wrk-tafel/admin/issues/3496), which stays open.

What this closes is narrower and doesn't wait on that answer: **detection**, so the drift is at
least visible rather than silent.

- Every `PRIVACY_NOTICE` document now stores the `retentionTime` value that was live at upload time
  (`DocumentEntity.retentionPeriodAtUpload`, stamped once by `HouseholdDocumentService` and never
  touched again).
- The customer search screen's existing "Datenschutzerklärung fehlt" filter (G2) gets a sibling,
  "Datenschutzerklärung veraltet", matching a household whose uploaded notice's stamped value no
  longer equals the live `tafeladmin.householdDeletion.retentionTime` - the same live-per-use read
  the retention job and both PDF templates already use, not a cached copy.
- Deliberately **not** automatic: no re-notify mail, no re-sign prompt, no auto-flag surfaced to the
  data subject - the filter only helps staff *find* affected households, consistent with how G2 never
  added a stored consent field for the application to reason about on its own.

What remains open: this flags *that* a printed figure and the live config disagree, not *whether*
that matters - it does not distinguish a window that got shorter from one that got longer, or one
changed and changed back to its original value, since the operator/DPO answer this was blocked on
([#3496](https://github.com/wrk-tafel/admin/issues/3496)) has not landed. A document uploaded before
this change has no stamped value and can never match the filter - it predates the ability to tell.


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
  shows the result; a member of staff makes the decision, and saving a household above the limit is
  never blocked — the `CUSTOMERS_ABOVE_LIMIT` permission only gates the *report* of such households.
- **Legacy customer tables** are gone — `R__00068_household_person_cleanup.sql` drops `customers`
  and `customers_addpersons` after verifying every row migrated, so no duplicate copy of the master
  data survives.
- **Client-side storage holds nothing personal** (re-audit 2026-08-29): `localStorage` carries the
  sidebar state, camera/scanner ids, the selected route and the offline queues of food-collection
  amounts and stop completions — ids and numbers, no names; `ngsw-config.json` has asset groups only,
  so the service worker never caches an API response. Page titles are route titles, never a name.
- **Error responses and the support context carry no record data**: `include-stacktrace: never`,
  `GenericExceptionHandler` replaces raw JPA/Jackson messages, and the browser's `recentErrors` keep
  status, method and path only — no request or response bodies.
- **Test data is synthetic** — `testdata.sql`, the `_http-calls/` samples, the Cypress fixtures and the
  user-guide screenshots use Mustermann/Musterfrau-style names and dummy addresses.
- **No telemetry**: `angular.json` has `analytics: false`, and there is no Sentry or analytics
  dependency anywhere in the frontend.

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
- whether a customer/staff privacy notice already signed and filed needs re-notification or
  re-consent once the operator later changes the retention window it states — detecting *that* the
  drift happened is now closed (see G29), but what to do about it is not — see G22's own note and
  [#3496](https://github.com/wrk-tafel/admin/issues/3496).

## 7. Where to start

Every gap below has its own issue; [§6](#6-what-this-repository-cannot-answer) collects the
organisational questions in [#3185](https://github.com/wrk-tafel/admin/issues/3185) that have no gap
number here.

| | Gap | Issue | Cost | First step |
|---|---|---|---|---|
| 1 | [G9](#g9-the-access-logs-lack-of-rotation-is-now-a-deliberate-documented-operator-hand-off) access log unbounded | [#3174](https://github.com/wrk-tafel/admin/issues/3174) | done | rotation stays host-side by deliberate, documented choice; `app.log`'s own rollover made explicit |
| 2 | [G4](#g4-a-hint-now-keeps-special-category-data-out-of-notes-and-documents) special-category data in free text | [#3175](https://github.com/wrk-tafel/admin/issues/3175) | done | a visible hint at the note field, the upload dialog and the user guide |
| 3 | [G3](#g3-the-support-form-now-hints-at-using-the-household-number-instead-of-a-name) support text can name a customer | [#3176](https://github.com/wrk-tafel/admin/issues/3176) | done | a hint in the dialog naming the household number instead; the screenshot preview was dropped |
| 4 | [G2](#g2-a-privacy-notice-now-exists-as-a-printable-consent-form-signed-on-paper) privacy notice | [#3177](https://github.com/wrk-tafel/admin/issues/3177) | done | printable consent form, per-household and reference-less |
| 5 | [G1](#g1-a-household-is-now-deleted-once-it-has-been-expired-long-enough) retention for customer data | [#3178](https://github.com/wrk-tafel/admin/issues/3178) | done | nightly job modelled on `AuditRetentionService`, `tafeladmin.householdDeletion.*` |
| 6 | [G5](#g5-a-customer-data-subject-request-can-now-be-answered-from-the-application) no Art. 15/20 export | [#3179](https://github.com/wrk-tafel/admin/issues/3179) | done | two endpoints, household record + documents, on `HouseholdExportService` |
| 7 | [G6](#g6-a-small-targeted-set-of-reads-is-now-recorded) reads unrecorded | [#3180](https://github.com/wrk-tafel/admin/issues/3180) | done | `AuditOperation.READ` on document download, PDF/Kundenliste generation and the G5 export |
| 8 | [G8](#g8-encryption-at-rest-is-now-confirmed-with-the-operator) unencrypted storage | [#3182](https://github.com/wrk-tafel/admin/issues/3182) | done | operator confirmed the documents volume, database volume and backups are encrypted at rest; recorded in [ADR-0021](adr/0021-documents-on-a-volume-metadata-in-the-database.md) |
| 9 | [G12](#g12-a-staff-data-subject-request-can-now-be-answered-from-the-application) no Art. 15/20 export for staff | [#3363](https://github.com/wrk-tafel/admin/issues/3363) | done | `GET /api/users/export`, `UserExportService` |
| 10 | [G13](#g13-a-system-user-or-employee-account-now-expires-too-mirroring-g1) retention for staff accounts | [#3386](https://github.com/wrk-tafel/admin/issues/3386) | done | nightly jobs modelled on `HouseholdRetentionService`, `tafeladmin.userDeletion.*`/`tafeladmin.employeeDeletion.*` |
| 11 | [G14](#g14-an-employee-with-no-user-account-can-now-be-exported-too-closing-a-gap-g12-left-open) no Art. 15/20 export for an employee with no user account | [#3394](https://github.com/wrk-tafel/admin/issues/3394) | done | `GET /api/employees/{employeeId}/export`, `EmployeeExportService` |
| 11 | [G7](#g7-the-documents-tab-now-requires-its-own-permission-separate-from-customer) documents tab behind its own permission | [#3181](https://github.com/wrk-tafel/admin/issues/3181) | done | `CUSTOMER_DOCUMENTS`, see [ADR-0050](adr/0050-customer-documents-split-into-its-own-permission.md) |
| 12 | [G11](#g11-a-fixed-threshold-now-flags-excessive-read-access) no breach detection | [#3184](https://github.com/wrk-tafel/admin/issues/3184) | done | `ExcessiveReadAccessDetectionService`, a fixed hourly read-count threshold |
| 13 | [G15](#g15-a-central-screen-now-ties-the-three-gdpr-exports-together-and-can-erase-what-it-finds-too) no single entry point spanning G5/G12/G14 | [#3396](https://github.com/wrk-tafel/admin/issues/3396) | done | `DataSubjectRequestController`/`DataSubjectRequestService`, `DATA_SUBJECT_REQUESTS` |
| 14 | [G10](#g10-copies-survive-an-erasure-and-nobody-can-say-for-how-long) erasure timeline undocumented | [#3183](https://github.com/wrk-tafel/admin/issues/3183) | done | `docs/userguide/datenauskunft.md`; backup-restore propagation stays with §6/#3185 |
| 15 | [G17](#g17-a-deleted-accounts-username-no-longer-outlives-it-on-every-other-table) `created_by`/`updated_by` outlive a deleted account | [#3426](https://github.com/wrk-tafel/admin/issues/3426) | done | `created_by`/`updated_by` as an `on delete set null` FK to `users(id)`, `R__00111_change_tracking_actor_user_fk.sql` |
| 16 | [G16](#g16-a-document-upload-is-now-checked-against-what-the-file-actually-is-not-just-its-declared-type) uploads trusted the declared content type | [#3420](https://github.com/wrk-tafel/admin/issues/3420) | done | `validateContentType` checks extension and magic bytes too, on both upload paths |
| 17 | [G18](#g18-the-scanner-share-now-expires-files-too-with-a-warning-before-it-does) scanner share unbounded | [#3443](https://github.com/wrk-tafel/admin/issues/3443) | done | nightly job modelled on `HouseholdRetentionService`, `tafeladmin.storage.scannerFileRetention*`, plus a push warning before deletion |
| 18 | [G19](#g19-a-retention-job-now-reports-itself-instead-of-only-logging-one-aggregate-line) retention jobs had no preview, no failure alert, no upper bound | [#3437](https://github.com/wrk-tafel/admin/issues/3437) | done | `RetentionRunAlertEvent`/`RETENTION_RUN` push, per-job `maxDeletionsPerRun` ceilings, `tafeladmin.audit.cleanupEnabled`, the "wird bald gelöscht" search filter |
| 19 | [G20](#g20-the-three-gdpr-exports-are-now-machine-readable-too-not-just-pdf) exports were PDF-only, not strictly Art. 20 machine-readable | [#3418](https://github.com/wrk-tafel/admin/issues/3418) | done | `daten.json` alongside `datenexport.pdf` in all three export ZIPs |
| 20 | [G21](#g21-a-household-note-can-now-be-corrected-or-erased-not-only-appended) notes were append-only, no Art. 16/17 path | [#3417](https://github.com/wrk-tafel/admin/issues/3417) | done | `PUT`/`DELETE` on `HouseholdNoteController`, edit/delete in the "Alle Notizen anzeigen" dialog, restricted to the note's own author |
| 21 | [G22](#g22-staff-now-get-an-art-13-notice-too-and-the-customer-notices-own-gaps-are-closed) no Art. 13 notice for staff; customer notice incomplete/hard-coded | [#3429](https://github.com/wrk-tafel/admin/issues/3429) | done | `retentionTime`/footer as template params, four added paragraphs, new `staff-pdf` notice; re-signing after a retention change stays open, see [#3496](https://github.com/wrk-tafel/admin/issues/3496) |
| 22 | [G23](#g23-login-is-now-rate-limited-and-ip-lockout-protected-and-no-longer-confirms-which-accounts-are-locked) no rate limiting, username-only lockout, lockout oracle, no password complexity | [#3432](https://github.com/wrk-tafel/admin/issues/3432), [#3484](https://github.com/wrk-tafel/admin/issues/3484) | done | `RateLimitFilter`/`RateLimiterIpService` (IP-scoped token bucket), `LoginAttemptIpService` (IP-scoped lockout), a unified `403` for wrong credentials and a lockout alike, a character-class rule for user-chosen passwords |
| 23 | [G24](#g24-the-name-bearing-csv-downloads-are-not-recorded-and-not-inventoried) bulk CSV/list downloads unrecorded | [#3507](https://github.com/wrk-tafel/admin/issues/3507) | small | one `READ` per bulk download, weighted in `ExcessiveReadAccessDetectionService` |
| 24 | [G25](#g25-a-search-term-is-a-name-and-it-travels-into-the-access-log-the-url-and-the-support-mail) search terms in `access.log`, the URL and the support mail | [#3506](https://github.com/wrk-tafel/admin/issues/3506) | small | access-log pattern without the query string; strip the query from the support context's `page` |
| 25 | [G26](#g26-three-report-permissions-reach-the-whole-household-record-without-customer) report permissions reach the full household record | [#3508](https://github.com/wrk-tafel/admin/issues/3508) | small | enforce `CUSTOMER and <report permission>` server-side, or slim the list items |
| 26 | [G27](#g27-the-notices-omit-the-ip-address-staff-and-the-audit-trail-customers) notices omit the IP address / the audit trail | [#3509](https://github.com/wrk-tafel/admin/issues/3509) | small | two paragraphs, figures as template parameters, golden PDFs regenerated |
| 27 | [G28](#g28-two-smaller-confidentiality-leaks-opportunistic-smtp-tls-and-a-mail-subject-on-a-lock-screen) opportunistic SMTP TLS; mail subject in a push body | [#3510](https://github.com/wrk-tafel/admin/issues/3510), [#3511](https://github.com/wrk-tafel/admin/issues/3511) | done | `starttls.required: true` set, named a failed mail by type and outbox id instead of its subject |
| 28 | [G29](#g29-a-signed-privacy-notice-can-now-be-flagged-when-its-printed-retention-figure-has-drifted-from-the-live-config) a signed privacy notice can silently drift from a later-changed retention window | [#3500](https://github.com/wrk-tafel/admin/issues/3500) | done | `DocumentEntity.retentionPeriodAtUpload` stamped at upload, a "Datenschutzerklärung veraltet" customer-search filter; whether to act on a drift stays open, see [#3496](https://github.com/wrk-tafel/admin/issues/3496) |

G1–G23, G28 and G29 are done — the operator has answered every question in #3185's coded-work table,
and G29 closes the detection half of #3500 (the "what to do about a drift" question stays open, see
G29's own "what remains open" and [#3496](https://github.com/wrk-tafel/admin/issues/3496)). G24–G27
were found by the 2026-08-29 re-audit of this document against the code and are still open, each with
its issue above. What [§6](#6-what-this-repository-cannot-answer) lists has no gap number and no PR
closes it; it stays open until the operator writes those answers down.

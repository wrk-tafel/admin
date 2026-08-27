# Scheduled jobs

Every `@Scheduled` method in the backend, in one place, so a new job can be timed sensibly against
the others and an existing one's schedule or coordination mechanism can be found without grepping
the codebase. This is a reference, not a decision record — **why** a job coordinates the way it does
is [ADR-0047](adr/0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md); this page only
tracks the current, concrete list. Keep it in sync when a scheduled job is added, removed, retimed or
reclassified.

Two things the "Coordination" column values mean, per ADR-0047:

- **Row-claim (`SKIP LOCKED`)** — the job deletes/selects its own candidate rows with
  `FOR UPDATE SKIP LOCKED`, so two instances share the work instead of racing over it. No
  `@SchedulerLock` needed.
- **`@SchedulerLock`** — the job has no rows of its own to claim (a notification, a filesystem walk),
  so ShedLock (`shedlock` table) ensures only one instance runs it per period.

A job not marked with either runs identically on every instance by design (see its own row).

## Nightly / early-morning (05:00–06:30)

Ordered by when they actually run, so the comment in each service about "running after X" can be
checked at a glance.

| Time | Job | Coordination | Purpose |
|---|---|---|---|
| 05:00 | `AuditRetentionService.cleanupExpiredEntries` (`tafeladmin.audit.cleanupCron`) | Row-claim | Deletes `audit_log` rows older than `tafeladmin.audit.retentionDays` (30d default) — GDPR gap G6/G11's retention half; refuses and alerts above `tafeladmin.audit.maxDeletionsPerRun`, alerts on failure — G19 |
| 05:00 | `DocumentStorageCleanupService.cleanupOrphanedFiles` | `@SchedulerLock` | Reconciles `tafeladmin.storage.documentsPath` against `household_documents`, deletes files with no DB row older than `tafeladmin.storage.orphanedFileMinAge` |
| 05:05 | `ScannerFileCleanupService.cleanupExpiredScannerFiles` | `@SchedulerLock` | Deletes files on `tafeladmin.storage.scannerPath` older than `tafeladmin.storage.scannerFileRetention` (7d default) — GDPR gap G18 |
| 06:00 | `HouseholdRetentionService.cleanupExpiredHouseholds` (`tafeladmin.householdDeletion.cleanupCron`) | Row-claim | Deletes households whose `validUntil` is older than `tafeladmin.householdDeletion.retentionYears` (7y default) — GDPR gap G1; refuses and alerts above `tafeladmin.householdDeletion.maxDeletionsPerRun`, alerts on failure — G19 |
| 06:15 | `UserRetentionService.cleanupExpiredUsers` (`tafeladmin.userDeletion.cleanupCron`) | Row-claim | Deletes user accounts unused for longer than `tafeladmin.userDeletion.retentionTime` (7y default), never an `ADMINISTRATOR` — GDPR gap G13; refuses and alerts above `tafeladmin.userDeletion.maxDeletionsPerRun`, alerts on failure — G19 |
| 06:30 | `EmployeeRetentionService.cleanupExpiredEmployees` (`tafeladmin.employeeDeletion.cleanupCron`) | Row-claim | Deletes employees referenced by nothing else, untouched for longer than `tafeladmin.employeeDeletion.retentionTime` (7y default) — GDPR gap G13; refuses and alerts above `tafeladmin.employeeDeletion.maxDeletionsPerRun`, alerts on failure — G19 |

## Daily, other times

| Time | Job | Coordination | Purpose |
|---|---|---|---|
| 08:00 | `DistributionStillOpenReminderService.remindAboutStillOpenDistribution` | `@SchedulerLock` | Push reminder while a distribution started on an earlier day is still open |
| 08:00 | `ScannerFileExpiryReminderService.remindAboutExpiringScannerFiles` | `@SchedulerLock` | Push reminder to `CUSTOMER_DOCUMENTS` holders once a scanner-share file is within `tafeladmin.storage.scannerFileRetentionWarning` (1d default) of `ScannerFileCleanupService` deleting it — GDPR gap G18 |

## Hourly or faster

| Interval | Job | Coordination | Purpose |
|---|---|---|---|
| Every 5s | `ConfigFileReloadService.reloadChangedConfigFiles` (`tafeladmin.configReload.cron`) | None — must run on every instance | Re-reads the config file(s) the app was started with and rebinds every `@ConfigurationProperties` bean in place (Config Hot-Reload) |
| Every 1s | `DocumentScannerWatcherService.pollForChanges` | Manual `LockingTaskExecutor` lock, skipped entirely when the scanner-folder feature is off | Polls `tafeladmin.storage.scannerPath` for changes and pushes them to the frontend live |
| Every 10s (`tafeladmin.mailOutbox.interval`) | `MailOutboxService.sendPendingMails` | Row-claim (`SKIP LOCKED`, one mail per transaction — ADR-0045) | Sends the next queued `mail_outbox` row |
| Hourly, on the hour (`tafeladmin.audit.breachDetectionCron`) | `ExcessiveReadAccessDetectionService.detectExcessiveReadAccess` | `@SchedulerLock` | Push warning when a user reads more sensitive records in the trailing hour than `tafeladmin.audit.breachDetection.readThreshold` — GDPR gap G11 |
| Every 1h | `LoginAttemptService.cleanupStaleEntries` | Row-claim | Deletes `login_attempts` rows past the lockout window |
| Every 1h | `ScannerService.cleanupScannerRegistrations` | Row-claim | Deletes `scanner_registrations` older than `tafeladmin.checkin.scannerRegistrationRetention` (2d default) |
| Every 1h | `SseOutboxService.cleanupOutbox` | Row-claim | Deletes `sse_outbox` rows older than `tafeladmin.sse.outboxRetention` (14d default) |
| Every 1h (`tafeladmin.mailOutbox.cleanupInterval`) | `MailOutboxService.cleanupOldMails` | Row-claim | Deletes sent `mail_outbox` rows past `sentRetention` (14d) and failed ones past `failedRetention` (30d) — ADR-0046 |

## Adding a new one

1. Pick a time slot (or interval) that doesn't collide with an unrelated job's assumption about
   ordering — several of the nightly jobs above document "runs after X" in their own KDoc for exactly
   this reason.
2. Decide row-claim vs. `@SchedulerLock` using ADR-0047's test: does the job have rows of its own to
   claim? If yes, `SKIP LOCKED`; if no, ShedLock.
3. Add a row to the table above in the same change.

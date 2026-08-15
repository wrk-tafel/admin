package at.wrk.tafel.admin.backend.database.common

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxEntity
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxRepository
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxStatus
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxEntity
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxRepository
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout
import org.springframework.beans.factory.annotation.Autowired
import java.time.LocalDateTime
import javax.sql.DataSource

/**
 * The five retention cleanups against a real database.
 *
 * Their deletes are native `DELETE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)`, which
 * nothing else can check: a native query is parsed by Postgres the first time it runs, not when the
 * context starts, so a typo in one of them would surface as a failing nightly job in production and
 * nowhere earlier. The mocked repositories of the services' unit tests cannot see the SQL at all.
 *
 * Every fixture is dated to the year 2000 and asserted by id, because these tables are shared by
 * every IT class in the run - and other classes' contexts keep their own pollers and cleanups going
 * against them. A cutoff that old matches nothing but this class's own rows.
 */
class ScheduledCleanupSkipLockedIT : TafelBaseIntegrationTest() {

    private companion object {
        val LONG_AGO: LocalDateTime = LocalDateTime.of(2000, 1, 1, 0, 0)
        val CUTOFF: LocalDateTime = LocalDateTime.of(2000, 6, 1, 0, 0)
        val STILL_RECENT: LocalDateTime = LocalDateTime.of(2000, 12, 1, 0, 0)
    }

    @Autowired
    private lateinit var sseOutboxRepository: SseOutboxRepository

    @Autowired
    private lateinit var mailOutboxRepository: MailOutboxRepository

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    @Autowired
    private lateinit var loginAttemptRepository: LoginAttemptRepository

    @Autowired
    private lateinit var scannerRegistrationRepository: ScannerRegistrationRepository

    @Autowired
    private lateinit var dataSource: DataSource

    private var fixtureCounter = 0

    @Test
    fun `sse outbox cleanup deletes what is past the cutoff and nothing else`() {
        val expired = givenSseEvent(LONG_AGO)
        val kept = givenSseEvent(STILL_RECENT)

        val deleted = sseOutboxRepository.deleteAllByEventTimeBeforeSkipLocked(CUTOFF)

        assertThat(deleted).isEqualTo(1)
        assertThat(sseOutboxRepository.findById(expired)).isEmpty()
        assertThat(sseOutboxRepository.findById(kept)).isPresent()
    }

    @Test
    fun `mail outbox cleanup deletes sent and given-up mails by their own windows`() {
        val expiredSent = givenMail(MailOutboxStatus.SENT, createdAt = LONG_AGO, sentAt = LONG_AGO)
        val keptSent = givenMail(MailOutboxStatus.SENT, createdAt = LONG_AGO, sentAt = STILL_RECENT)
        val expiredFailed = givenMail(MailOutboxStatus.FAILED, createdAt = LONG_AGO, sentAt = null)
        val keptFailed = givenMail(MailOutboxStatus.FAILED, createdAt = STILL_RECENT, sentAt = null)

        val deletedSent = mailOutboxRepository.deleteAllByStatusAndSentAtBeforeSkipLocked(MailOutboxStatus.SENT.name, CUTOFF)
        val deletedFailed =
            mailOutboxRepository.deleteAllByStatusAndCreatedAtBeforeSkipLocked(MailOutboxStatus.FAILED.name, CUTOFF)

        assertThat(deletedSent).isEqualTo(1)
        assertThat(deletedFailed).isEqualTo(1)
        assertThat(mailOutboxRepository.findById(expiredSent)).isEmpty()
        assertThat(mailOutboxRepository.findById(expiredFailed)).isEmpty()
        assertThat(mailOutboxRepository.findById(keptSent)).isPresent()
        assertThat(mailOutboxRepository.findById(keptFailed)).isPresent()
    }

    @Test
    fun `audit cleanup deletes what is past the cutoff and nothing else`() {
        val expired = givenAuditEntry(LONG_AGO)
        val kept = givenAuditEntry(STILL_RECENT)

        val deleted = auditLogRepository.deleteAllByOccurredAtBeforeSkipLocked(CUTOFF)

        assertThat(deleted).isEqualTo(1)
        assertThat(auditLogRepository.findById(expired)).isEmpty()
        assertThat(auditLogRepository.findById(kept)).isPresent()
    }

    @Test
    fun `login attempt cleanup deletes what is past the cutoff and nothing else`() {
        val expired = givenLoginAttempt(LONG_AGO)
        val kept = givenLoginAttempt(STILL_RECENT)

        val deleted = loginAttemptRepository.deleteAllByLastFailureAtBeforeSkipLocked(CUTOFF)

        assertThat(deleted).isEqualTo(1)
        assertThat(loginAttemptRepository.findById(expired)).isEmpty()
        assertThat(loginAttemptRepository.findById(kept)).isPresent()
    }

    @Test
    fun `scanner registration cleanup deletes what is past the cutoff and nothing else`() {
        val expired = givenScannerRegistration(LONG_AGO)
        val kept = givenScannerRegistration(STILL_RECENT)

        val deleted = scannerRegistrationRepository.deleteAllByRegistrationTimeBeforeSkipLocked(CUTOFF)

        assertThat(deleted).isEqualTo(1)
        assertThat(scannerRegistrationRepository.findById(expired)).isEmpty()
        assertThat(scannerRegistrationRepository.findById(kept)).isPresent()
    }

    /**
     * What `SKIP LOCKED` buys over a plain delete: a row another transaction is holding is left
     * alone and the rest of the batch still goes, so a second instance's cleanup neither waits for
     * the first nor fails on the rows it already took.
     *
     * The timeout is the actual assertion for the "neither waits" half - without `SKIP LOCKED` the
     * delete blocks on the held row until the lock goes away, which here is never.
     */
    @Test
    @Timeout(30)
    fun `a row another transaction holds is skipped, not waited for`() {
        val lockedByAnother = givenSseEvent(LONG_AGO)
        val deletable = givenSseEvent(LONG_AGO)

        val deleted = holdingRowLockOn(lockedByAnother) {
            sseOutboxRepository.deleteAllByEventTimeBeforeSkipLocked(CUTOFF)
        }

        assertThat(deleted).isEqualTo(1)
        assertThat(sseOutboxRepository.findById(deletable)).isEmpty()
        assertThat(sseOutboxRepository.findById(lockedByAnother)).isPresent()

        // Once the holder is gone the row is nobody's, and the next tick takes it.
        assertThat(sseOutboxRepository.deleteAllByEventTimeBeforeSkipLocked(CUTOFF)).isEqualTo(1)
        assertThat(sseOutboxRepository.findById(lockedByAnother)).isEmpty()
    }

    /**
     * A second connection, which is all Postgres can tell one instance from another by: it holds a
     * row lock for as long as [block] runs and rolls back afterwards, leaving the row itself
     * untouched.
     */
    private fun <T> holdingRowLockOn(sseOutboxId: Long, block: () -> T): T = dataSource.connection.use { connection ->
        connection.autoCommit = false
        try {
            connection.prepareStatement("SELECT id FROM sse_outbox WHERE id = ? FOR UPDATE").use { statement ->
                statement.setLong(1, sseOutboxId)
                statement.executeQuery().use { assertThat(it.next()).isTrue() }
            }
            block()
        } finally {
            connection.rollback()
        }
    }

    /** `sse_outbox` is unique on (notification_name, event_time), so every fixture gets its own name. */
    private fun givenSseEvent(eventTime: LocalDateTime): Long = sseOutboxRepository.save(
        SseOutboxEntity().apply {
            this.eventTime = eventTime
            notificationName = "cleanup_test_${fixtureCounter++}"
            payload = "{}"
        },
    ).id!!

    private fun givenMail(status: MailOutboxStatus, createdAt: LocalDateTime, sentAt: LocalDateTime?): Long = mailOutboxRepository.save(
        MailOutboxEntity().apply {
            this.createdAt = createdAt
            this.status = status
            this.sentAt = sentAt
            subject = "cleanup skip locked test"
            recipients = "cleanup-test@localhost"
            message = "irrelevant".toByteArray()
            // Not null in the schema, and irrelevant to a mail that is already SENT or FAILED.
            nextAttemptAt = createdAt
        },
    ).id!!

    private fun givenAuditEntry(occurredAt: LocalDateTime): Long = auditLogRepository.save(
        AuditLogEntity(
            occurredAt = occurredAt,
            entityType = "CleanupSkipLockedTest",
            operation = AuditOperation.UPDATE,
        ),
    ).id!!

    private fun givenLoginAttempt(lastFailureAt: LocalDateTime): Long = loginAttemptRepository.save(
        LoginAttemptEntity(
            username = "cleanup-skip-locked-$lastFailureAt",
            lastFailureAt = lastFailureAt,
        ),
    ).id!!

    private fun givenScannerRegistration(registrationTime: LocalDateTime): Long = scannerRegistrationRepository.save(
        ScannerRegistrationEntity(
            registrationTime = registrationTime,
            scannerId = SCANNER_ID_BASE + registrationTime.year + registrationTime.monthValue,
        ),
    ).id!!
}

/** Far above anything the scanner-registration tests hand out, so these fixtures collide with none of them. */
private const val SCANNER_ID_BASE = 90000

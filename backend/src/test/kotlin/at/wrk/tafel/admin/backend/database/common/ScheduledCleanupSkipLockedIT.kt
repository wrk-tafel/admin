package at.wrk.tafel.admin.backend.database.common

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
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
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDate
import java.time.LocalDateTime
import javax.sql.DataSource

/**
 * The eight retention cleanups against a real database.
 *
 * Five of them are native `DELETE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)` statements,
 * which nothing else can check: a native query is parsed by Postgres the first time it runs, not
 * when the context starts, so a typo in one of them would surface as a failing nightly job in
 * production and nowhere earlier. The household, user and employee ones are a plain
 * `SELECT ... FOR UPDATE SKIP LOCKED` - they only claim candidate ids, since the actual deletion has
 * to go through a service method for its cascades (`HouseholdService.deleteHouseholdByHouseholdId`,
 * `TafelUserDetailsManager.deleteUser`, `EmployeeService.deleteEmployee`) - but are exposed to
 * exactly the same class of bug. The mocked repositories of the services' unit tests cannot see any
 * of this SQL.
 *
 * Every fixture is dated to the year 2000 and asserted by id, because these tables are shared by
 * every IT class in the run - and other classes' contexts keep their own pollers and cleanups going
 * against them. A cutoff that old matches nothing but this class's own rows.
 */
class ScheduledCleanupSkipLockedIT : TafelBaseIntegrationTest() {

    private companion object {
        val LONG_AGO: LocalDateTime = LocalDateTime.of(2000, 1, 1, 0, 0)
        val CUTOFF: LocalDateTime = LocalDateTime.of(2000, 6, 1, 0, 0)
        val LONG_AGO_DATE: LocalDate = LocalDate.of(2000, 1, 1)
        val CUTOFF_DATE: LocalDate = LocalDate.of(2000, 6, 1)
        val STILL_RECENT_DATE: LocalDate = LocalDate.of(2000, 12, 1)
        val STILL_RECENT: LocalDateTime = LocalDateTime.of(2000, 12, 1, 0, 0)

        /**
         * Shared across every test method rather than an instance field - JUnit5 creates a fresh
         * `ScheduledCleanupSkipLockedIT` instance per test method by default, so an instance field
         * would restart at 0 for each one and collide on a uniquely-constrained fixture value (e.g.
         * `employees.personnel_number`) between two different tests that both use `givenUser`.
         */
        var fixtureCounter = 0
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
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var employeeRepository: EmployeeRepository

    @Autowired
    private lateinit var dataSource: DataSource

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

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
     * Only the candidate-selection query, not the actual deletion - that happens through
     * `HouseholdService.deleteHouseholdByHouseholdId` for its cascades, which is a service-layer
     * concern the mocked `HouseholdRetentionServiceTest` already covers. This is the one place that
     * proves the native `FOR UPDATE SKIP LOCKED` select itself is valid SQL and matches on `valid_until`
     * the way `HouseholdRetentionService` expects.
     */
    @Test
    fun `household deletion candidates select what is past the cutoff and nothing else`() {
        val expired = givenHousehold(LONG_AGO_DATE)
        val kept = givenHousehold(STILL_RECENT_DATE)

        val candidates = householdRepository.findExpiredHouseholdIdsSkipLocked(CUTOFF_DATE)

        assertThat(candidates).containsExactly(expired)
        assertThat(candidates).doesNotContain(kept)
    }

    /**
     * Only the candidate-selection query, not the actual deletion - see the household test above for
     * why.
     *
     * `contains`, not `containsExactly`: unlike `households`/`validUntil`, more than one test in this
     * class plants an account backdated to [LONG_AGO] (see the never-logged-in and
     * administrator-exclusion tests below), so another test's leftover fixture can legitimately show
     * up here too - what matters is that *this* one does, and the still-recently-logged-in one
     * doesn't.
     */
    @Test
    fun `user deletion candidates select accounts whose last login is past the cutoff`() {
        val expired = givenUser(lastLogin = LONG_AGO)
        val keptStillRecent = givenUser(lastLogin = STILL_RECENT)

        val candidates = userRepository.findExpiredUserIdsSkipLocked(CUTOFF, UserPermissions.ADMINISTRATOR.key)

        assertThat(candidates).contains(expired)
        assertThat(candidates).doesNotContain(keptStillRecent)
    }

    /**
     * An account that has never logged in has no `last_login` to measure from - falls back to
     * `created_at` instead, so a long-forgotten never-used account still ages out rather than being
     * permanently exempt. `contains`, not `containsExactly` - see the test above for why.
     */
    @Test
    fun `user deletion candidates fall back to created_at for an account that never logged in`() {
        val expired = givenUser(lastLogin = null, createdAt = LONG_AGO)
        val keptStillRecent = givenUser(lastLogin = null, createdAt = STILL_RECENT)

        val candidates = userRepository.findExpiredUserIdsSkipLocked(CUTOFF, UserPermissions.ADMINISTRATOR.key)

        assertThat(candidates).contains(expired)
        assertThat(candidates).doesNotContain(keptStillRecent)
    }

    /**
     * The one exclusion the login/creation cutoff alone doesn't cover: an administrator is still
     * never a candidate, unlike every other account just as inactive - see
     * `TafelAdminUserRetentionProperties`'s KDoc for why this job is stricter here than the manual
     * "last administrator" safeguards in `UserController`. `contains`, not `containsExactly` - see
     * the first test above for why.
     */
    @Test
    fun `user deletion candidates exclude an administrator regardless of age`() {
        val keptAdministrator = givenUser(lastLogin = LONG_AGO, administrator = true)
        val expired = givenUser(lastLogin = LONG_AGO)

        val candidates = userRepository.findExpiredUserIdsSkipLocked(CUTOFF, UserPermissions.ADMINISTRATOR.key)

        assertThat(candidates).contains(expired)
        assertThat(candidates).doesNotContain(keptAdministrator)
    }

    /**
     * Only the candidate-selection query, not the actual deletion - see the household test above for
     * why. Also covers two of the five `NOT EXISTS` clauses
     * (`EmployeeRepository.findExpiredEmployeeIdsSkipLocked`'s KDoc has the full list): a linked user
     * account and a household issuer are both references that keep an employee out of the candidate
     * set, regardless of `updated_at`. `household_notes`, `food_collections` (driver/co-driver) and
     * `routes_stops_completions` follow the identical single-nullable-FK `NOT EXISTS` shape already
     * proven here via `households` and aren't each given their own fixture -
     * `food_collections` in particular needs a `distributions`+`routes` graph to satisfy its own
     * not-null FKs, which is disproportionate for exercising a SQL shape this test already covers.
     */
    @Test
    fun `employee deletion candidates select unreferenced employees untouched since before the cutoff and nothing else`() {
        val expired = givenEmployee(updatedAt = LONG_AGO)
        val keptStillRecent = givenEmployee(updatedAt = STILL_RECENT)
        val keptLinkedToUser = givenEmployee(updatedAt = LONG_AGO, linkedToUser = true)
        val keptHouseholdIssuer = givenEmployee(updatedAt = LONG_AGO, referencedByHousehold = true)

        val candidates = employeeRepository.findExpiredEmployeeIdsSkipLocked(CUTOFF)

        assertThat(candidates).containsExactly(expired)
        assertThat(candidates).doesNotContain(keptStillRecent, keptLinkedToUser, keptHouseholdIssuer)
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

    /** Returns the business `household_id`, since that is what the query under test selects. */
    private fun givenHousehold(validUntil: LocalDate): Long {
        val householdId = HOUSEHOLD_ID_BASE + fixtureCounter++
        householdRepository.save(
            HouseholdEntity(
                householdId = householdId,
                validUntil = validUntil,
                locked = false,
            ),
        )
        return householdId
    }

    /**
     * `created_at` is Hibernate-generated (`@CreationTimestamp`), so a value assigned on the entity
     * before `save` is always overwritten with the real current time - it has to be backdated with a
     * direct SQL update afterwards instead, same as `updated_at` on [givenEmployee] below.
     * `last_login` has no such generator and can be set directly.
     *
     * The employee is built transient and saved through `UserEntity`'s own `PERSIST` cascade rather
     * than saved separately first - handing `save` an already-persisted (and by then detached)
     * `EmployeeEntity` throws `PersistentObjectException`, since a `PERSIST` cascade only ever
     * applies to a still-transient association.
     */
    private fun givenUser(lastLogin: LocalDateTime?, createdAt: LocalDateTime = LONG_AGO, administrator: Boolean = false): Long {
        val number = fixtureCounter++
        val newUser = UserEntity(
            username = "cleanup-skip-locked-user-$number",
            password = "irrelevant",
            employee = EmployeeEntity(personnelNumber = "cleanup-skip-locked-user-$number", firstname = "first", lastname = "last"),
            enabled = true,
        ).apply { this.lastLogin = lastLogin }
        if (administrator) {
            newUser.authorities.add(UserAuthorityEntity(user = newUser, name = UserPermissions.ADMINISTRATOR.key))
        }

        val user = userRepository.save(newUser)
        jdbcTemplate.update("UPDATE users SET created_at = ? WHERE id = ?", createdAt, user.id)
        return user.id!!
    }

    /**
     * [linkedToUser] adds a user account referencing the employee, built together with it through
     * `UserEntity`'s `PERSIST` cascade for the same reason [givenUser] above does.
     * [referencedByHousehold] instead points a fresh household's `issuer` at the employee - safe to
     * do with an already-persisted employee since `HouseholdEntity.issuer` carries no cascade at all
     * (unlike `UserEntity.employee`), so Hibernate only ever reads its id for the FK column. Either
     * way the employee is never a candidate.
     */
    private fun givenEmployee(updatedAt: LocalDateTime, linkedToUser: Boolean = false, referencedByHousehold: Boolean = false): Long {
        val number = fixtureCounter++
        val employeeId = if (linkedToUser) {
            userRepository.save(
                UserEntity(
                    username = "cleanup-skip-locked-employee-$number",
                    password = "irrelevant",
                    employee = EmployeeEntity(personnelNumber = "cleanup-skip-locked-employee-$number", firstname = "first", lastname = "last"),
                    enabled = true,
                ),
            ).employee.id!!
        } else {
            employeeRepository.save(
                EmployeeEntity(personnelNumber = "cleanup-skip-locked-employee-$number", firstname = "first", lastname = "last"),
            ).id!!
        }

        jdbcTemplate.update("UPDATE employees SET updated_at = ? WHERE id = ?", updatedAt, employeeId)

        if (referencedByHousehold) {
            val household = HouseholdEntity(
                householdId = HOUSEHOLD_ID_BASE + fixtureCounter++,
                validUntil = STILL_RECENT_DATE,
                locked = false,
            )
            household.issuer = employeeRepository.getReferenceById(employeeId)
            householdRepository.save(household)
        }

        return employeeId
    }
}

/** Far above anything the scanner-registration tests hand out, so these fixtures collide with none of them. */
private const val SCANNER_ID_BASE = 90000

/** Far above `TestdataGenerator.generateRandomLong()`'s range, so these fixtures collide with none of them. */
private const val HOUSEHOLD_ID_BASE = 90_000_000_000_000L

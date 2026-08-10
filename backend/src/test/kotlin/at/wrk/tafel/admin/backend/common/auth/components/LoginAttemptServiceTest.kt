package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.UserLockedOutEvent
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityLoginAttemptsProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset

internal class LoginAttemptServiceTest {

    companion object {
        private const val MAX_FAILURES = 3
        private const val LOCKOUT_DURATION_SECONDS = 900L
    }

    private class MutableClock(private var instant: Instant) : Clock() {
        override fun getZone(): ZoneOffset = ZoneOffset.UTC
        override fun withZone(zone: java.time.ZoneId): Clock = this
        override fun instant(): Instant = instant

        fun advanceBy(duration: Duration) {
            instant = instant.plus(duration)
        }
    }

    private val entries = mutableMapOf<String, LoginAttemptEntity>()
    private val clock = MutableClock(Instant.parse("2024-01-01T10:00:00Z"))
    private var nextId = 1L

    private lateinit var loginAttemptRepository: LoginAttemptRepository
    private lateinit var advisoryLockService: AdvisoryLockService
    private lateinit var eventPublisher: ApplicationEventPublisher
    private lateinit var service: LoginAttemptService

    @BeforeEach
    fun setUp() {
        entries.clear()

        eventPublisher = mockk(relaxed = true)
        loginAttemptRepository = mockk()
        every { loginAttemptRepository.findByUsername(any()) } answers { entries[firstArg()] }
        every { loginAttemptRepository.findAllByOrderByLastFailureAtDescIdDesc(any()) } answers {
            val pageRequest = firstArg<PageRequest>()
            val sorted = entries.values.sortedWith(compareByDescending<LoginAttemptEntity> { it.lastFailureAt }.thenByDescending { it.id })
            PageImpl(sorted, pageRequest, sorted.size.toLong())
        }
        every { loginAttemptRepository.save(any()) } answers {
            val entity = firstArg<LoginAttemptEntity>()
            if (entity.id == null) {
                entity.id = nextId++
            }
            entries[entity.username!!] = entity
            entity
        }
        every { loginAttemptRepository.deleteByUsername(any()) } answers {
            entries.remove(firstArg<String>())
        }
        every { loginAttemptRepository.deleteAllByLastFailureAtBefore(any()) } answers {
            val date = firstArg<LocalDateTime>()
            entries.values.removeIf { it.lastFailureAt!!.isBefore(date) }
        }
        every { loginAttemptRepository.existsById(any()) } answers {
            entries.values.any { it.id == firstArg<Long>() }
        }
        every { loginAttemptRepository.deleteById(any()) } answers {
            entries.values.removeIf { it.id == firstArg<Long>() }
        }

        advisoryLockService = mockk()
        every { advisoryLockService.withLock(any(), any<() -> Any?>()) } answers {
            secondArg<() -> Any?>().invoke()
        }

        val applicationProperties = ApplicationProperties(
            security = SecurityProperties(
                jwtToken = SecurityJwtTokenProperties(
                    issuer = "test",
                    audience = "test",
                    secret = SecurityJwtTokenSecretProperties(value = "secret", algorithm = "HMACSHA256"),
                    expirationTimeInSeconds = 3600,
                    expirationTimePwdChangeInSeconds = 300,
                ),
                loginAttempts = SecurityLoginAttemptsProperties(
                    maxFailures = MAX_FAILURES,
                    lockoutDurationInSeconds = LOCKOUT_DURATION_SECONDS,
                ),
            ),
        )

        service = LoginAttemptService(loginAttemptRepository, advisoryLockService, applicationProperties, clock, eventPublisher)
    }

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    @BeforeEach
    fun setUpLogCapture() {
        logger = LoggerFactory.getLogger(LoginAttemptService::class.java) as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
    }

    @AfterEach
    fun tearDownLogCapture() {
        logger.detachAppender(logAppender)
    }

    @Test
    fun `not locked without any failures`() {
        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `not locked below max failures`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("user") }

        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `locked after max failures`() {
        repeat(MAX_FAILURES) { service.recordFailure("user") }

        assertThat(service.isLocked("user")).isTrue
    }

    @Test
    fun `logs a warning once the lockout is triggered, but not before`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("user") }
        assertThat(logAppender.list).isEmpty()

        service.recordFailure("user")

        assertThat(logAppender.list).hasSize(1)
        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(logAppender.list.single().formattedMessage)
            .contains("user")
            .contains(MAX_FAILURES.toString())
    }

    @Test
    fun `publishes a UserLockedOutEvent once the lockout is triggered, but not before`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("user") }
        verify(exactly = 0) { eventPublisher.publishEvent(any<UserLockedOutEvent>()) }

        service.recordFailure("user")

        verify(exactly = 1) { eventPublisher.publishEvent(UserLockedOutEvent(username = "user", failureCount = MAX_FAILURES)) }
    }

    /**
     * The event carries the normalized username, not what was typed - anything consuming it (a push
     * notification naming the account, say) would otherwise report the same lockout under a
     * different spelling each time.
     */
    @Test
    fun `the published event carries the normalized username`() {
        repeat(MAX_FAILURES) { service.recordFailure("  USER ") }

        verify(exactly = 1) { eventPublisher.publishEvent(UserLockedOutEvent(username = "user", failureCount = MAX_FAILURES)) }
    }

    @Test
    fun `failures are recorded under the advisory lock`() {
        service.recordFailure("user")

        verify(exactly = 1) { advisoryLockService.withLock(any(), any<() -> Any?>()) }
    }

    @Test
    fun `lock applies case-insensitive and ignores whitespace`() {
        repeat(MAX_FAILURES) { service.recordFailure("User") }

        assertThat(service.isLocked(" USER ")).isTrue
    }

    @Test
    fun `other users are not affected by a lock`() {
        repeat(MAX_FAILURES) { service.recordFailure("user") }

        assertThat(service.isLocked("other-user")).isFalse
    }

    @Test
    fun `lock expires after lockout duration`() {
        repeat(MAX_FAILURES) { service.recordFailure("user") }

        clock.advanceBy(Duration.ofSeconds(LOCKOUT_DURATION_SECONDS + 1))

        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `successful login resets the failure counter`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("user") }
        service.recordSuccess("user")
        repeat(MAX_FAILURES - 1) { service.recordFailure("user") }

        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `stale failures outside the window dont count towards the limit`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("user") }

        clock.advanceBy(Duration.ofSeconds(LOCKOUT_DURATION_SECONDS + 1))
        service.recordFailure("user")

        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `failures after an expired lock start a fresh counter`() {
        repeat(MAX_FAILURES) { service.recordFailure("user") }
        clock.advanceBy(Duration.ofSeconds(LOCKOUT_DURATION_SECONDS + 1))

        service.recordFailure("user")

        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `cleanup removes stale entries and keeps recent ones`() {
        service.recordFailure("stale-user")
        clock.advanceBy(Duration.ofSeconds(LOCKOUT_DURATION_SECONDS + 1))
        service.recordFailure("recent-user")

        service.cleanupStaleEntries()

        assertThat(entries).containsOnlyKeys("recent-user")
    }

    @Test
    fun `findAll returns a page of tracked entries, most recent failure first`() {
        service.recordFailure("user1")
        clock.advanceBy(Duration.ofSeconds(1))
        service.recordFailure("user2")

        val page = service.findAll(PageRequest.of(0, 10))

        assertThat(page.content).extracting<String> { it.username }.containsExactly("user2", "user1")
        assertThat(page.totalElements).isEqualTo(2)
    }

    @Test
    fun `deleteById removes the entry, clearing any lock`() {
        repeat(MAX_FAILURES) { service.recordFailure("user") }
        val id = entries.getValue("user").id!!

        service.deleteById(id)

        assertThat(entries).isEmpty()
        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `deleteById fails when id is not found`() {
        assertThatThrownBy { service.deleteById(999L) }
            .isInstanceOf(NotFoundException::class.java)
    }
}

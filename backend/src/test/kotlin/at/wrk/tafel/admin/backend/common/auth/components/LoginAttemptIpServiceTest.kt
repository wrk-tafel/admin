package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityLoginAttemptsIpProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptIpEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptIpRepository
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset

internal class LoginAttemptIpServiceTest {

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

    private val entries = mutableMapOf<String, LoginAttemptIpEntity>()
    private val clock = MutableClock(Instant.parse("2024-01-01T10:00:00Z"))

    private lateinit var loginAttemptIpRepository: LoginAttemptIpRepository
    private lateinit var advisoryLockService: AdvisoryLockService
    private lateinit var service: LoginAttemptIpService

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    @BeforeEach
    fun setUp() {
        entries.clear()

        loginAttemptIpRepository = mockk()
        every { loginAttemptIpRepository.findByIpAddress(any()) } answers { entries[firstArg()] }
        every { loginAttemptIpRepository.save(any()) } answers {
            val entity = firstArg<LoginAttemptIpEntity>()
            entries[entity.ipAddress] = entity
            entity
        }
        every { loginAttemptIpRepository.delete(any()) } answers {
            entries.values.removeIf { it === firstArg<LoginAttemptIpEntity>() }
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
                loginAttemptsIp = SecurityLoginAttemptsIpProperties(
                    maxFailures = MAX_FAILURES,
                    lockoutDurationInSeconds = LOCKOUT_DURATION_SECONDS,
                ),
            ),
        )

        service = LoginAttemptIpService(loginAttemptIpRepository, advisoryLockService, applicationProperties, clock)

        logger = LoggerFactory.getLogger(LoginAttemptIpService::class.java) as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
    }

    @AfterEach
    fun tearDown() {
        logger.detachAppender(logAppender)
    }

    @Test
    fun `not locked without any failures`() {
        assertThat(service.isLocked("1.2.3.4")).isFalse
    }

    @Test
    fun `not locked below max failures`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("1.2.3.4") }

        assertThat(service.isLocked("1.2.3.4")).isFalse
    }

    @Test
    fun `locked after max failures`() {
        repeat(MAX_FAILURES) { service.recordFailure("1.2.3.4") }

        assertThat(service.isLocked("1.2.3.4")).isTrue
    }

    @Test
    fun `logs a warning once the lockout is triggered, but not before`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("1.2.3.4") }
        assertThat(logAppender.list).isEmpty()

        service.recordFailure("1.2.3.4")

        assertThat(logAppender.list).hasSize(1)
        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(logAppender.list.single().formattedMessage)
            .contains("1.2.3.4")
            .contains(MAX_FAILURES.toString())
    }

    @Test
    fun `failures are recorded under the advisory lock`() {
        service.recordFailure("1.2.3.4")

        verify(exactly = 1) { advisoryLockService.withLock(any(), any<() -> Any?>()) }
    }

    @Test
    fun `other IPs are not affected by a lock`() {
        repeat(MAX_FAILURES) { service.recordFailure("1.2.3.4") }

        assertThat(service.isLocked("5.6.7.8")).isFalse
    }

    @Test
    fun `lock expires after lockout duration`() {
        repeat(MAX_FAILURES) { service.recordFailure("1.2.3.4") }

        clock.advanceBy(Duration.ofSeconds(LOCKOUT_DURATION_SECONDS + 1))

        assertThat(service.isLocked("1.2.3.4")).isFalse
    }

    @Test
    fun `successful login resets the failure counter`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("1.2.3.4") }

        service.recordSuccess("1.2.3.4")
        repeat(MAX_FAILURES - 1) { service.recordFailure("1.2.3.4") }

        assertThat(service.isLocked("1.2.3.4")).isFalse
    }

    @Test
    fun `recordSuccess for an ip with no attempts does nothing`() {
        service.recordSuccess("1.2.3.4")

        verify(exactly = 0) { loginAttemptIpRepository.delete(any()) }
    }

    @Test
    fun `a failure older than the lockout window resets the count rather than accumulating`() {
        repeat(MAX_FAILURES - 1) { service.recordFailure("1.2.3.4") }

        clock.advanceBy(Duration.ofSeconds(LOCKOUT_DURATION_SECONDS + 1))
        service.recordFailure("1.2.3.4")

        assertThat(service.isLocked("1.2.3.4")).isFalse
    }

    @Test
    fun `cleanupStaleEntries deletes attempts past the lockout window`() {
        every { loginAttemptIpRepository.deleteAllByLastFailureAtBeforeSkipLocked(any()) } returns 0

        service.cleanupStaleEntries()

        verify(exactly = 1) { loginAttemptIpRepository.deleteAllByLastFailureAtBeforeSkipLocked(LocalDateTime.now(clock).minusSeconds(LOCKOUT_DURATION_SECONDS)) }
    }
}

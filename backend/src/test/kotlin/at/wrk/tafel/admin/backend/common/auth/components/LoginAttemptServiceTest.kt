package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityLoginAttemptsProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
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

    private lateinit var loginAttemptRepository: LoginAttemptRepository
    private lateinit var advisoryLockService: AdvisoryLockService
    private lateinit var service: LoginAttemptService

    @BeforeEach
    fun setUp() {
        entries.clear()

        loginAttemptRepository = mockk()
        every { loginAttemptRepository.findByUsername(any()) } answers { entries[firstArg()] }
        every { loginAttemptRepository.save(any()) } answers {
            val entity = firstArg<LoginAttemptEntity>()
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
                    expirationTimePwdChangeInSeconds = 300
                ),
                loginAttempts = SecurityLoginAttemptsProperties(
                    maxFailures = MAX_FAILURES,
                    lockoutDurationInSeconds = LOCKOUT_DURATION_SECONDS
                )
            )
        )

        service = LoginAttemptService(loginAttemptRepository, advisoryLockService, applicationProperties, clock)
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

}

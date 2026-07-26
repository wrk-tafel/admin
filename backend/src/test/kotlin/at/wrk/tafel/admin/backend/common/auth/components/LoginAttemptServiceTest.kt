package at.wrk.tafel.admin.backend.common.auth.components

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset

internal class LoginAttemptServiceTest {

    companion object {
        private const val MAX_FAILURES = 3
        private val LOCKOUT_DURATION = Duration.ofMinutes(15)
    }

    private class MutableClock(private var instant: Instant) : Clock() {
        override fun getZone(): ZoneOffset = ZoneOffset.UTC
        override fun withZone(zone: java.time.ZoneId): Clock = this
        override fun instant(): Instant = instant

        fun advanceBy(duration: Duration) {
            instant = instant.plus(duration)
        }
    }

    private val clock = MutableClock(Instant.parse("2024-01-01T10:00:00Z"))
    private val service = LoginAttemptService(MAX_FAILURES, LOCKOUT_DURATION, clock)

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

        clock.advanceBy(LOCKOUT_DURATION.plusSeconds(1))

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

        clock.advanceBy(LOCKOUT_DURATION.plusSeconds(1))
        service.recordFailure("user")

        assertThat(service.isLocked("user")).isFalse
    }

    @Test
    fun `failures after an expired lock start a fresh counter`() {
        repeat(MAX_FAILURES) { service.recordFailure("user") }
        clock.advanceBy(LOCKOUT_DURATION.plusSeconds(1))

        service.recordFailure("user")

        assertThat(service.isLocked("user")).isFalse
    }

}

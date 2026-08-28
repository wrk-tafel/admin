package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityRateLimitProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset

internal class RateLimiterIpServiceTest {

    private class MutableClock(private var instant: Instant) : Clock() {
        override fun getZone(): ZoneOffset = ZoneOffset.UTC
        override fun withZone(zone: java.time.ZoneId): Clock = this
        override fun instant(): Instant = instant

        fun advanceBy(duration: Duration) {
            instant = instant.plus(duration)
        }
    }

    private val clock = MutableClock(Instant.parse("2024-01-01T10:00:00Z"))
    private var rateLimitProperties = SecurityRateLimitProperties(
        enabled = true,
        capacity = 3,
        refillTokens = 3,
        refillPeriodInSeconds = 60,
    )
    private lateinit var applicationProperties: ApplicationProperties
    private lateinit var service: RateLimiterIpService

    @BeforeEach
    fun setUp() {
        applicationProperties = ApplicationProperties(
            security = SecurityProperties(
                jwtToken = SecurityJwtTokenProperties(
                    issuer = "issuer",
                    audience = "audience",
                    secret = SecurityJwtTokenSecretProperties(value = "secret", algorithm = "HMACSHA256"),
                    expirationTimeInSeconds = 3600,
                    expirationTimePwdChangeInSeconds = 300,
                ),
                rateLimit = rateLimitProperties,
            ),
        )
        service = RateLimiterIpService(applicationProperties, clock)
    }

    @Test
    fun `tryConsume allows requests up to capacity and then denies`() {
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()
    }

    @Test
    fun `tryConsume refills tokens over time up to capacity`() {
        repeat(3) { service.tryConsume("login", "1.2.3.4") }
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()

        // one third of the refill period passed - exactly one token back
        clock.advanceBy(Duration.ofSeconds(20))

        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()

        // far longer than the refill period - caps at capacity rather than accumulating unboundedly
        clock.advanceBy(Duration.ofHours(1))

        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()
    }

    @Test
    fun `tryConsume tracks separate budgets per ip`() {
        repeat(3) { service.tryConsume("login", "1.2.3.4") }
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()

        assertThat(service.tryConsume("login", "5.6.7.8")).isTrue()
    }

    @Test
    fun `tryConsume tracks separate budgets per scope for the same ip`() {
        repeat(3) { service.tryConsume("login", "1.2.3.4") }
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()

        assertThat(service.tryConsume("support", "1.2.3.4")).isTrue()
    }

    @Test
    fun `tryConsume always allows requests when disabled`() {
        rateLimitProperties = rateLimitProperties.copy(enabled = false)
        setUp()

        repeat(10) {
            assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        }
    }

    @Test
    fun `cleanupStaleEntries evicts a bucket that has fully refilled but leaves one still catching up`() {
        // capacity 3, refillTokens 3 per 60s -> one token every 20s
        service.tryConsume("login", "1.2.3.4") // down to 2 - needs only 20s to be full again
        repeat(3) { service.tryConsume("login", "5.6.7.8") } // drained to 0 - needs a full 60s

        clock.advanceBy(Duration.ofSeconds(30))
        service.cleanupStaleEntries()

        assertThat(bucketCount()).isEqualTo(1)

        // 1.2.3.4's bucket was evicted (it had refilled all the way), so it comes back as a fresh,
        // full one rather than remembering it was ever touched
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isTrue()
        assertThat(service.tryConsume("login", "1.2.3.4")).isFalse()

        // 5.6.7.8's bucket survived cleanup - it kept the ~1.5 tokens it had refilled by then rather
        // than being reset
        assertThat(service.tryConsume("login", "5.6.7.8")).isTrue()
        assertThat(service.tryConsume("login", "5.6.7.8")).isFalse()
    }

    @Suppress("UNCHECKED_CAST")
    private fun bucketCount(): Int {
        val field = RateLimiterIpService::class.java.getDeclaredField("buckets")
        field.isAccessible = true
        return (field.get(service) as Map<String, Any>).size
    }
}

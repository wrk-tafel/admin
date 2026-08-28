package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityRateLimitProperties
import io.github.bucket4j.Bucket
import io.github.bucket4j.TimeMeter
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * A Bucket4j token bucket per `(scope, ip)`, kept in this process's own memory rather than the
 * database - unlike [LoginAttemptService], nothing here needs to be visible to another instance for
 * it to do its job: it only has to make a single IP's request rate expensive to run up, and each
 * instance limiting its own share of that IP's traffic already does that. See
 * [SecurityRateLimitProperties] for the limits themselves.
 */
@Service
class RateLimiterIpService(
    private val applicationProperties: ApplicationProperties,
    clock: Clock,
) {

    // Bucket4j's TimeMeter has two abstract methods, so it isn't a SAM Kotlin can turn a lambda
    // into - this adapts the injected Clock (the same one every other login/lockout service in this
    // package takes, so tests can drive it with the shared MutableClock pattern) into one.
    private class ClockTimeMeter(private val clock: Clock) : TimeMeter {
        override fun currentTimeNanos(): Long = clock.instant().let { it.epochSecond * 1_000_000_000L + it.nano }
        override fun isWallClockBased(): Boolean = true
    }

    private val timeMeter = ClockTimeMeter(clock)
    private val buckets = ConcurrentHashMap<String, Bucket>()

    fun tryConsume(scope: String, ip: String): Boolean {
        val settings = applicationProperties.security.rateLimit
        if (!settings.enabled) {
            return true
        }

        return buckets.computeIfAbsent(key(scope, ip)) { newBucket(settings) }.tryConsume(1)
    }

    // Buckets for an IP that stopped sending requests would otherwise sit in memory forever - a
    // bucket already back at full capacity (nothing left to throttle) is stale enough to drop, since
    // recreating it on the next request costs nothing a live bucket wouldn't have cost anyway. Local
    // in-memory state, so - like ConfigFileReloadService - this runs identically on every instance
    // rather than being claimed or ShedLocked.
    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupStaleEntries() {
        val capacity = applicationProperties.security.rateLimit.capacity.toLong()
        buckets.entries.removeIf { (_, bucket) -> bucket.availableTokens >= capacity }
    }

    private fun newBucket(settings: SecurityRateLimitProperties): Bucket = Bucket.builder()
        .withCustomTimePrecision(timeMeter)
        .addLimit { limit ->
            limit.capacity(settings.capacity.toLong())
                .refillGreedy(settings.refillTokens.toLong(), Duration.ofSeconds(settings.refillPeriodInSeconds))
        }
        .build()

    private fun key(scope: String, ip: String) = "$scope:$ip"
}

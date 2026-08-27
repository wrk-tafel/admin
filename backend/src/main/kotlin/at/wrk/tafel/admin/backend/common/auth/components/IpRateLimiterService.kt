package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityRateLimitProperties
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * A token bucket per `(scope, ip)`, kept in this process's own memory rather than the database -
 * unlike [LoginAttemptService], nothing here needs to be visible to another instance for it to do its
 * job: it only has to make a single IP's request rate expensive to run up, and each instance limiting
 * its own share of that IP's traffic already does that. See [SecurityRateLimitProperties] for the
 * limits themselves.
 */
@Service
class IpRateLimiterService(
    private val applicationProperties: ApplicationProperties,
    private val clock: Clock,
) {

    private class Bucket(var tokens: Double, var lastRefill: Instant)

    private val buckets = ConcurrentHashMap<String, Bucket>()

    fun tryConsume(scope: String, ip: String): Boolean {
        val settings = applicationProperties.security.rateLimit
        if (!settings.enabled) {
            return true
        }

        val bucket = buckets.computeIfAbsent(key(scope, ip)) { Bucket(settings.capacity.toDouble(), clock.instant()) }
        synchronized(bucket) {
            refill(bucket, settings)

            return if (bucket.tokens >= 1.0) {
                bucket.tokens -= 1.0
                true
            } else {
                false
            }
        }
    }

    // Buckets for an IP that stopped sending requests would otherwise sit in memory forever - a
    // bucket already back at full capacity (nothing left to throttle) is stale enough to drop, since
    // recreating it on the next request costs nothing a live bucket wouldn't have cost anyway. Local
    // in-memory state, so - like ConfigFileReloadService - this runs identically on every instance
    // rather than being claimed or ShedLocked.
    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupStaleEntries() {
        val settings = applicationProperties.security.rateLimit
        buckets.entries.removeIf { (_, bucket) ->
            synchronized(bucket) {
                refill(bucket, settings)
                bucket.tokens >= settings.capacity.toDouble()
            }
        }
    }

    private fun refill(bucket: Bucket, settings: SecurityRateLimitProperties) {
        val now = clock.instant()
        val elapsedSeconds = Duration.between(bucket.lastRefill, now).toMillis() / 1000.0
        if (elapsedSeconds <= 0) {
            return
        }

        val refillRatePerSecond = settings.refillTokens.toDouble() / settings.refillPeriodInSeconds.toDouble()
        bucket.tokens = minOf(settings.capacity.toDouble(), bucket.tokens + elapsedSeconds * refillRatePerSecond)
        bucket.lastRefill = now
    }

    private fun key(scope: String, ip: String) = "$scope:$ip"
}

package at.wrk.tafel.admin.backend.common.retention

import java.time.Duration
import java.time.Period

/**
 * Renders a retention job's [Period] (`householdDeletion`/`userDeletion`/`employeeDeletion.retentionTime`,
 * config as `7y`/`18m`/`730d`-style values) as German display text for a privacy notice, so the
 * printed sheet shows whichever of years/months/days an operator actually configured rather than
 * assuming years alone. Dative throughout, since every call site uses it after "mehr als"/"nach":
 * plural ("7 Jahren", "3 Monaten", "730 Tagen", "15 Minuten", "30 Sekunden") but singular for exactly
 * one ("1 Jahr", "1 Monat", "1 Tag", "1 Minute", "1 Sekunde").
 */
object RetentionPeriodFormatter {
    fun format(period: Period): String {
        val parts = buildList {
            if (period.years != 0) add(unit(period.years.toLong(), "Jahr", "Jahren"))
            if (period.months != 0) add(unit(period.months.toLong(), "Monat", "Monaten"))
            if (period.days != 0) add(unit(period.days.toLong(), "Tag", "Tagen"))
        }
        return parts.ifEmpty { listOf("0 Tagen") }.joinToString(" ")
    }

    /**
     * Same idea as [format], for the shorter, seconds-scale windows a lockout duration is configured
     * in (e.g. `security.loginAttemptsIp.lockoutDurationInSeconds`, GDPR gap G27, issue #3509).
     */
    fun format(duration: Duration): String {
        val minutes = duration.toMinutes()
        val seconds = duration.minusMinutes(minutes).seconds
        val parts = buildList {
            if (minutes != 0L) add(unit(minutes, "Minute", "Minuten"))
            if (seconds != 0L) add(unit(seconds, "Sekunde", "Sekunden"))
        }
        return parts.ifEmpty { listOf("0 Sekunden") }.joinToString(" ")
    }

    private fun unit(count: Long, singular: String, plural: String) = "$count ${if (count == 1L) singular else plural}"
}

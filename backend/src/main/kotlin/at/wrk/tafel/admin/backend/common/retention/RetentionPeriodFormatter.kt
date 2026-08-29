package at.wrk.tafel.admin.backend.common.retention

import java.time.Duration
import java.time.Period

/**
 * Renders a retention job's [Period] (`householdDeletion`/`userDeletion`/`employeeDeletion.retentionTime`,
 * config as `7y`/`18m`/`730d`-style values) as German display text for a privacy notice, so the
 * printed sheet shows whichever of years/months/days an operator actually configured rather than
 * assuming years alone. Dative plural throughout ("Jahren"/"Monaten"/"Tagen"/"Minuten"/"Sekunden")
 * since every call site uses it after "mehr als"/"nach".
 */
object RetentionPeriodFormatter {
    fun format(period: Period): String {
        val parts = buildList {
            if (period.years != 0) add("${period.years} Jahren")
            if (period.months != 0) add("${period.months} Monaten")
            if (period.days != 0) add("${period.days} Tagen")
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
            if (minutes != 0L) add("$minutes Minuten")
            if (seconds != 0L) add("$seconds Sekunden")
        }
        return parts.ifEmpty { listOf("0 Sekunden") }.joinToString(" ")
    }
}

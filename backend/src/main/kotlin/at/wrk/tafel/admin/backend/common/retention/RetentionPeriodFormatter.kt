package at.wrk.tafel.admin.backend.common.retention

import java.time.Period

/**
 * Renders a retention job's [Period] (`householdDeletion`/`userDeletion`/`employeeDeletion.retentionTime`,
 * config as `7y`/`18m`/`730d`-style values) as German display text for a privacy notice, so the
 * printed sheet shows whichever of years/months/days an operator actually configured rather than
 * assuming years alone. Dative plural throughout ("Jahren"/"Monaten"/"Tagen") since every call site
 * uses it after "mehr als"/"nach".
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
}

package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import org.apache.commons.lang3.StringUtils

/**
 * Builds a safe ASCII filename for a household-scoped download -
 * "<prefix>-<householdId>-<lastname>-<firstname>.<extension>". Shared by PDF generation
 * ([HouseholdService.generatePdf]) and the GDPR data export (`HouseholdExportService`, issue #3179)
 * so the two don't drift.
 *
 * `StringUtils.stripAccents` strips diacritics generally (é, ñ, ...) but - like
 * `java.text.Normalizer` underneath it - leaves "ß" alone (it has no Unicode decomposition), so
 * without the explicit replace it still collapses to a lone "-" in the ASCII-only regex below, e.g.
 * "Großfamilie" -> "gro-familie" instead of "gross...".
 */
internal fun buildHouseholdFilename(prefix: String, household: HouseholdEntity, extension: String): String {
    val mainPerson = household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson }
    val householdName = listOfNotNull(
        household.householdId,
        mainPerson?.lastname,
        mainPerson?.firstname,
    ).joinToString("-") { it.toString() }
    return StringUtils.stripAccents("$prefix-$householdName").lowercase()
        .replace("ß", "ss")
        .replace("[^a-z0-9]".toRegex(), "-") + ".$extension"
}

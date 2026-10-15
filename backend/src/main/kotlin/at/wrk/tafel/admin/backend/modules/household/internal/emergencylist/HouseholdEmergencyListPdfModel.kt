package at.wrk.tafel.admin.backend.modules.household.internal.emergencylist

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonRootName

@JsonRootName("data")
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@ExcludeFromTestCoverage
data class HouseholdEmergencyListPdfModel(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val title: String,
    val subtitle: String,
    val generatedAt: String,
    val countHouseholds: Int,
    val countPersons: Int,
    val households: List<HouseholdEmergencyListItem>,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdEmergencyListPdfModel

        return logoContentType == other.logoContentType &&
            logoBytes.contentEquals(other.logoBytes) &&
            title == other.title &&
            subtitle == other.subtitle &&
            generatedAt == other.generatedAt &&
            countHouseholds == other.countHouseholds &&
            countPersons == other.countPersons &&
            households == other.households
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + title.hashCode()
        result = 31 * result + subtitle.hashCode()
        result = 31 * result + generatedAt.hashCode()
        result = 31 * result + countHouseholds
        result = 31 * result + countPersons
        result = 31 * result + households.hashCode()
        return result
    }
}

/** One line of the list. [lockText] is absent for a household that is not locked. */
@ExcludeFromTestCoverage
data class HouseholdEmergencyListItem(
    val householdId: Long,
    val name: String,
    val countPersons: Int,
    val validUntil: String,
    val lockText: String?,
)

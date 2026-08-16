package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonRootName

@ExcludeFromTestCoverage
data class HouseholdListPdfResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdListPdfResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

@JsonRootName("data")
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@ExcludeFromTestCoverage
data class HouseholdListPdfModel(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val title: String,
    val halftimeTicketNumber: Int?,
    val countHouseholdsOverall: Int?,
    val countPersonsOverall: Int?,
    val households: List<HouseholdListItem>,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdListPdfModel

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (title != other.title) return false
        if (halftimeTicketNumber != other.halftimeTicketNumber) return false
        if (countHouseholdsOverall != other.countHouseholdsOverall) return false
        if (countPersonsOverall != other.countPersonsOverall) return false
        if (households != other.households) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + title.hashCode()
        result = 31 * result + (halftimeTicketNumber ?: 0)
        result = 31 * result + (countHouseholdsOverall ?: 0)
        result = 31 * result + (countPersonsOverall ?: 0)
        result = 31 * result + households.hashCode()
        return result
    }
}

@ExcludeFromTestCoverage
data class HouseholdListItem(
    val ticketNumber: Int,
    val householdId: Long,
    val countPersons: Int,
    val countInfants: Int,
)

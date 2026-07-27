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
    val title: String,
    val halftimeTicketNumber: Int?,
    val countHouseholdsOverall: Int?,
    val countPersonsOverall: Int?,
    val households: List<HouseholdListItem>,
)

@ExcludeFromTestCoverage
data class HouseholdListItem(
    val ticketNumber: Int,
    val householdId: Long,
    val countPersons: Int,
    val countInfants: Int,
)

package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class DistributionListResponse(
    val items: List<DistributionItem>,
)

@ExcludeFromTestCoverage
data class DistributionUpdateResponse(
    val distribution: DistributionItem?,
    /**
     * Households registered for [distribution] so far. `null` while none is open, and on the events
     * that announce a start/close: those carry no count, the stream sends it separately as it changes.
     */
    val registeredCustomers: Int? = null,
)

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long,
    val startedAt: LocalDateTime,
    val endedAt: LocalDateTime?,
)

@ExcludeFromTestCoverage
data class AssignHouseholdRequest(
    @field:Positive
    val householdId: Long,
    @field:Positive
    val ticketNumber: Int,
)

/** A goodwill package ("Kulanzpaket") - a ticket for persons who are not a registered household. */
@ExcludeFromTestCoverage
data class GoodwillTicketRequest(
    @field:Positive
    val ticketNumber: Int,
    @field:Positive
    @field:Max(99)
    val personCount: Int,
    @field:PositiveOrZero
    @field:Max(99)
    val infantCount: Int,
)

@ExcludeFromTestCoverage
data class TicketNumberResponse(
    val ticketNumber: Int?,
)

@ExcludeFromTestCoverage
data class TicketHouseholdResponse(
    val ticketNumber: Int,
    /** `null` for a goodwill package ("Kulanzpaket"), which belongs to no household. */
    val householdId: Long?,
    val goodwill: Boolean = false,
)

@ExcludeFromTestCoverage
data class DistributionStatisticRequest(
    @field:Positive
    val employeeCount: Int,
    val selectedShelterIds: List<Long>,
)

@ExcludeFromTestCoverage
data class DistributionNoteRequest(
    val notes: String,
)

@ExcludeFromTestCoverage
data class DistributionCloseResponse(
    val errors: List<String>,
    val warnings: List<String>,
) {
    fun isInvalid(): Boolean = errors.isNotEmpty() || warnings.isNotEmpty()
    fun hasOnlyWarnings(): Boolean = errors.isEmpty() && warnings.isNotEmpty()
}

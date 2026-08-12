package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
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

@ExcludeFromTestCoverage
data class TicketNumberResponse(
    val ticketNumber: Int?,
)

@ExcludeFromTestCoverage
data class DistributionStatisticRequest(
    @field:PositiveOrZero
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

/**
 * How many mails a resend actually put in the queue - which is not a fixed number: a mail type
 * without recipients produces none, and a deployment without a mail server queues nothing at all.
 * Saying so is the point, since the request otherwise succeeds either way.
 */
@ExcludeFromTestCoverage
data class DistributionSendMailsResponse(
    val queuedMails: Long,
)

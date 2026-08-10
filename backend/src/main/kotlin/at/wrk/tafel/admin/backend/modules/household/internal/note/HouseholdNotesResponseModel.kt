package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class HouseholdNoteItem(
    val id: Long,
    val author: String? = null,
    val timestamp: LocalDateTime,
    val note: String,
)

@ExcludeFromTestCoverage
data class CreateHouseholdNoteRequest(
    @field:NotBlank
    val note: String,
)

@ExcludeFromTestCoverage
data class HouseholdNoteSearchResult(
    val items: List<HouseholdNoteItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

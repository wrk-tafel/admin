package at.wrk.tafel.admin.backend.modules.household.internal.note

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDateTime


@ExcludeFromTestCoverage
data class HouseholdNotesResponse(
    val items: List<HouseholdNoteItem> = emptyList(),
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class HouseholdNoteItem(
    val author: String? = null,
    val timestamp: LocalDateTime,
    val note: String
)

@ExcludeFromTestCoverage
data class CreateHouseholdNoteRequest(
    val note: String
)

@ExcludeFromTestCoverage
data class HouseholdNoteSearchResult(
    val items: List<HouseholdNoteItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

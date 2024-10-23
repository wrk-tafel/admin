package at.wrk.tafel.admin.backend.modules.customer.api.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class CustomerNotesResponse(
    val items: List<CustomerNoteItem> = emptyList(),
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class CustomerNoteItem(
    val author: String? = null,
    val timestamp: LocalDateTime,
    val note: String
)

@ExcludeFromTestCoverage
data class CreateCustomerNoteRequest(
    val note: String
)

@ExcludeFromTestCoverage
data class CustomerNoteSearchResult(
    val items: List<CustomerNoteItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

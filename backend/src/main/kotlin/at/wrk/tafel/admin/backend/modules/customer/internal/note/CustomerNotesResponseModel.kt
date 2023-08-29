package at.wrk.tafel.admin.backend.modules.customer.internal.note

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDateTime


@ExcludeFromTestCoverage
data class CustomerNotesResponse(
    val notes: List<CustomerNoteItem> = emptyList()
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

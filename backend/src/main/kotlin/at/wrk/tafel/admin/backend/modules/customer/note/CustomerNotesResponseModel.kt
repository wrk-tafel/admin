package at.wrk.tafel.admin.backend.modules.customer.note

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.ZonedDateTime

@ExcludeFromTestCoverage
data class CustomerNotesResponse(
    val notes: List<CustomerNoteItem> = emptyList()
)

@ExcludeFromTestCoverage
data class CustomerNoteItem(
    val author: String? = null,
    val timestamp: ZonedDateTime,
    val note: String
)

@ExcludeFromTestCoverage
data class CreateCustomerNoteRequest(
    val note: String
)

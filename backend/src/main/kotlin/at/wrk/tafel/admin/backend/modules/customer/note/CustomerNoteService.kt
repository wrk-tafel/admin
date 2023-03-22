package at.wrk.tafel.admin.backend.modules.customer.note

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerNoteEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerNoteRepository
import org.springframework.stereotype.Service
import java.time.ZonedDateTime

@Service
class CustomerNoteService(
    private val customerNoteRepository: CustomerNoteRepository
) {

    fun getNotes(customerId: Long): List<CustomerNoteItem> {
        val notes = customerNoteRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
        return notes.map { mapNote(it) }
    }

    private fun mapNote(entity: CustomerNoteEntity): CustomerNoteItem {
        val user = entity.user
        val userDisplayString = listOfNotNull(user?.personnelNumber, user?.firstname, user?.lastname)
            .joinToString(" ")
            .ifBlank { null }

        return CustomerNoteItem(
            author = userDisplayString,
            timestamp = entity.createdAt!!,
            note = entity.note!!
        )
    }

}

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

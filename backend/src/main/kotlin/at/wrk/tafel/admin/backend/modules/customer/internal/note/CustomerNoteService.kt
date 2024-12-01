package at.wrk.tafel.admin.backend.modules.customer.internal.note

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.customer.CustomerNoteEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.customer.CustomerNoteRepository
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class CustomerNoteService(
    private val customerNoteRepository: CustomerNoteRepository,
    private val customerRepository: CustomerRepository,
    private val userRepository: UserRepository,
) {

    fun getNotes(customerId: Long, page: Int?): CustomerNoteSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 5)
        val pagedResult =
            customerNoteRepository.findAllByCustomerCustomerIdOrderByCreatedAtDesc(customerId, pageRequest)

        return CustomerNoteSearchResult(
            items = pagedResult.map { mapNote(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize
        )
    }

    private fun mapNote(entity: CustomerNoteEntity): CustomerNoteItem {
        val employee = entity.employee
        val userDisplayString = listOfNotNull(employee?.personnelNumber, employee?.firstname, employee?.lastname)
            .joinToString(" ")
            .ifBlank { null }

        return CustomerNoteItem(
            author = userDisplayString,
            timestamp = entity.createdAt!!,
            note = entity.note!!
        )
    }

    fun createNewNote(customerId: Long, note: String): CustomerNoteItem {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val noteEntity = CustomerNoteEntity()
        noteEntity.customer = customerRepository.findByCustomerId(customerId)
        noteEntity.employee = userRepository.findByUsername(authenticatedUser.username!!)!!.employee
        noteEntity.note = note

        val savedEntity = customerNoteRepository.save(noteEntity)
        return mapNote(savedEntity)
    }

}

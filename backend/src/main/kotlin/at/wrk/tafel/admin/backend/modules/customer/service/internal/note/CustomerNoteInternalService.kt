package at.wrk.tafel.admin.backend.modules.customer.service.internal.note

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerNoteEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerNoteRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerNoteItem
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerNoteSearchResult
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class CustomerNoteInternalService(
    private val customerNoteRepository: CustomerNoteRepository,
    private val customerRepository: CustomerRepository,
    private val userRepository: UserRepository
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

    fun createNewNote(customerId: Long, note: String): CustomerNoteItem {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val noteEntity = CustomerNoteEntity()
        noteEntity.customer = customerRepository.findByCustomerId(customerId)
        noteEntity.user = userRepository.findByUsername(authenticatedUser.username!!)
        noteEntity.note = note

        val savedEntity = customerNoteRepository.save(noteEntity)
        return mapNote(savedEntity)
    }

}

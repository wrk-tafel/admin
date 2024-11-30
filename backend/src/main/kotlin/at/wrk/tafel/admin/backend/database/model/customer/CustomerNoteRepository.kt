package at.wrk.tafel.admin.backend.database.model.customer

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository

interface CustomerNoteRepository : JpaRepository<CustomerNoteEntity, Long> {

    fun findAllByCustomerCustomerIdOrderByCreatedAtDesc(
        customerId: Long,
        pageRequest: PageRequest
    ): Page<CustomerNoteEntity>

}

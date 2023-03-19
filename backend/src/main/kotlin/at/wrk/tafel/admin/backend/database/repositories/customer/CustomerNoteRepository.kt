package at.wrk.tafel.admin.backend.database.repositories.customer

import at.wrk.tafel.admin.backend.database.entities.customer.CustomerNoteEntity
import org.springframework.data.jpa.repository.JpaRepository

interface CustomerNoteRepository : JpaRepository<CustomerNoteEntity, Long> {
}

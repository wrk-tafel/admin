package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import org.springframework.data.jpa.repository.JpaRepository

interface CustomerAddPersonRepository : JpaRepository<CustomerAddPersonEntity, Long> {
}

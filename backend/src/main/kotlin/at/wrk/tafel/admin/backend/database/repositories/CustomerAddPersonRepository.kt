package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.*

interface CustomerAddPersonRepository : JpaRepository<CustomerAddPersonEntity, Long> {
}

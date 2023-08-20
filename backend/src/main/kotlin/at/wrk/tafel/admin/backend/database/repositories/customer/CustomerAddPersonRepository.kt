package at.wrk.tafel.admin.backend.database.repositories.customer

import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import org.springframework.data.jpa.repository.JpaRepository

interface CustomerAddPersonRepository : JpaRepository<CustomerAddPersonEntity, Long>

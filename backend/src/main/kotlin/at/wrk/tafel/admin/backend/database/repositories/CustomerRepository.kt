package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface CustomerRepository : JpaRepository<CustomerEntity, Long> {
    @Query("SELECT nextval('customer_id_sequence')", nativeQuery = true)
    fun getNextCustomerSequenceValue(): Long
    fun findByCustomerId(customerId: Long): CustomerEntity
}

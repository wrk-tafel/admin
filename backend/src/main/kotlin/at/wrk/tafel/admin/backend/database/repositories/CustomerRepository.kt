package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.*

interface CustomerRepository : JpaRepository<CustomerEntity, Long> {
    @Query("SELECT nextval('customer_id_sequence')", nativeQuery = true)
    fun getNextCustomerSequenceValue(): Long
    fun existsByCustomerId(id: Long): Boolean
    fun findByCustomerId(customerId: Long): Optional<CustomerEntity>

    fun findAllByFirstnameContainingIgnoreCase(
        @Param("firstname") firstname: String,
    ): List<CustomerEntity>

    fun findAllByLastnameContainingIgnoreCase(
        @Param("lastname") lastname: String
    ): List<CustomerEntity>

    fun findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(
        @Param("firstname") firstname: String,
        @Param("lastname") lastname: String
    ): List<CustomerEntity>

}

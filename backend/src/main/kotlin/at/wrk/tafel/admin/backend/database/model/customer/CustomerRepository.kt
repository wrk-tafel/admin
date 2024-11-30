package at.wrk.tafel.admin.backend.database.model.customer

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDateTime

interface CustomerRepository : JpaRepository<CustomerEntity, Long>, JpaSpecificationExecutor<CustomerEntity> {

    @Query("SELECT nextval('customer_id_sequence')", nativeQuery = true)
    fun getNextCustomerSequenceValue(): Long
    fun existsByCustomerId(id: Long): Boolean

    fun getReferenceByCustomerId(id: Long): CustomerEntity
    fun findByCustomerId(customerId: Long): CustomerEntity?

    fun deleteByCustomerId(customerId: Long)

    fun findAllByCreatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<CustomerEntity>

    fun findAllByProlongedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): List<CustomerEntity>

    fun countByUpdatedAtBetween(fromDate: LocalDateTime, toDate: LocalDateTime): Int

}

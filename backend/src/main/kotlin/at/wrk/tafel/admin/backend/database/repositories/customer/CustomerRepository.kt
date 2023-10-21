package at.wrk.tafel.admin.backend.database.repositories.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
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

    @Query(
        value = """
        WITH compare AS (SELECT id, customer_id, firstname, lastname, address_street, address_houseNumber, address_door
                 from customers)
        SELECT levenshtein(
                       lower(
                               concat(customers.firstname,
                                      customers.lastname)
                       ),
                       lower(
                               concat(compare.firstname,
                                      compare.lastname)
                       )
               )                             AS scoreName,
               levenshtein(
                       lower(
                               concat(customers.address_street,
                                      customers.address_houseNumber,
                                      customers.address_door)
                       ),
                       lower(
                               concat(compare.address_street,
                                      compare.address_houseNumber,
                                      compare.address_door)
                       )
               )                             AS scoreAddress,
               customers.customer_id         as customerId,
               compare.customer_id           as compareCustomerId
        FROM customers,
             compare
        WHERE customers.customer_id <> compare.customer_id
          AND customers.id <> compare.id
          AND soundex(customers.lastname) = soundex(compare.lastname)
          AND soundex(customers.firstname) = soundex(compare.firstname)
          AND levenshtein(
                      lower(
                              concat(customers.firstname,
                                     customers.lastname)
                      ),
                      lower(
                              concat(compare.firstname,
                                     compare.lastname)
                      )
              ) < 4
          AND levenshtein(
                      lower(
                              concat(customers.address_street,
                                     customers.address_houseNumber,
                                     customers.address_door)
                      ),
                      lower(
                              concat(compare.address_street,
                                     compare.address_houseNumber,
                                     compare.address_door)
                      )
              ) < 10
        order by scoreName asc, scoreAddress asc, customers.lastname asc, customers.firstname asc;
    """, nativeQuery = true
    )
    fun findDuplicates(pageRequest: PageRequest): Page<CustomerDuplicateEntry>

}

@ExcludeFromTestCoverage
data class CustomerDuplicateEntry(
    val customerId: Long,
    val compareCustomerId: Long
)

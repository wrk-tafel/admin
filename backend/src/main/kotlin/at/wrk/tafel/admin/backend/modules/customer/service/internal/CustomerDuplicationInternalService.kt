package at.wrk.tafel.admin.backend.modules.customer.service.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.api.model.Customer
import at.wrk.tafel.admin.backend.modules.customer.service.internal.converter.CustomerConverter
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.jdbc.core.DataClassRowMapper
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.SingleColumnRowMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CustomerDuplicationService(
    private val customerRepository: CustomerRepository,
    private val customerConverter: CustomerConverter,
    private val jdbcTemplate: JdbcTemplate
) {

    @Transactional
    fun findDuplicates(page: Int?): CustomerDuplicateSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 1)

        val duplicatesPage = loadDuplicates(pageRequest)

        val items = duplicatesPage.map { entry ->
            val customerId = entry.customerId
            val similarCustomers = entry.compareCustomerIdList.split(",")

            CustomerDuplicateSearchResultItem(
                customer = customerConverter.mapEntityToCustomer(
                    customerRepository.findByCustomerId(customerId)!!
                ),
                similarCustomers = similarCustomers.mapNotNull { similarCustomerId ->
                    customerRepository.findByCustomerId(similarCustomerId.toLong())
                        ?.let { customerConverter.mapEntityToCustomer(it) }
                }
            )
        }.toList()

        return CustomerDuplicateSearchResult(
            items = items,
            totalCount = duplicatesPage.totalElements,
            currentPage = page ?: 1,
            totalPages = duplicatesPage.totalPages,
            pageSize = pageRequest.pageSize
        )
    }

    private fun loadDuplicates(pageable: Pageable): Page<CustomerDuplicateEntry> {
        val rowCountSql = """
            WITH compare AS (SELECT id, customer_id, firstname, lastname, address_street, address_houseNumber, address_door
                             from customers)
            SELECT count(distinct customers.customer_id)
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
                  ) < 10;
        """.trimIndent()
        val totalCount = jdbcTemplate.query(rowCountSql, SingleColumnRowMapper<Long>()).first()

        val sql = """
            WITH compare AS (SELECT id, customer_id, firstname, lastname, address_street, address_houseNumber, address_door
                             from customers)
            SELECT customers.customer_id                                                                     as customerId,
                   string_agg(compare.customer_id::character varying, ',' order by compare.customer_id desc) as compareCustomerIdList
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
            group by customers.id
            order by customers.customer_id desc
            LIMIT ${pageable.pageSize} OFFSET ${pageable.offset}
        """.trimIndent()

        val rows = jdbcTemplate.query(sql, DataClassRowMapper(CustomerDuplicateEntry::class.java))
        return PageImpl(rows, pageable, totalCount)
    }

}

@ExcludeFromTestCoverage
data class CustomerDuplicateEntry(
    val customerId: Long,
    val compareCustomerIdList: String
)

@ExcludeFromTestCoverage
data class CustomerDuplicateSearchResult(
    val items: List<CustomerDuplicateSearchResultItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class CustomerDuplicateSearchResultItem(
    val customer: Customer,
    val similarCustomers: List<Customer>
)

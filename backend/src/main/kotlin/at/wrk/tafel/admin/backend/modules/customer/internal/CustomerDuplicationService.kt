package at.wrk.tafel.admin.backend.modules.customer.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.internal.converter.CustomerConverter
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service

@Service
class CustomerDuplicationService(
    private val customerRepository: CustomerRepository,
    private val customerConverter: CustomerConverter
) {

    fun findDuplicates(page: Int?): CustomerDuplicateSearchResult {
        val duplicatesPage = customerRepository.findDuplicates(PageRequest.of(page?.minus(1) ?: 0, 10))
        val uniqueCustomers = duplicatesPage.map { it.customerId }.distinct()

        val mapping = uniqueCustomers.map { uniqueCustomerId ->
            val customer = customerRepository.findByCustomerId(uniqueCustomerId)!!
            val duplicateEntries = duplicatesPage.filter { it.customerId == uniqueCustomerId }
                .distinctBy { it.compareCustomerId }

            customer to duplicateEntries
        }

        return CustomerDuplicateSearchResult(
            items = mapping.map { entry ->
                CustomerDuplicateSearchResultItem(
                    customer = customerConverter.mapEntityToCustomer(entry.first),
                    similarCustomers = entry.second.mapNotNull { similarCustomer ->
                        customerRepository.findByCustomerId(similarCustomer.compareCustomerId)
                            ?.let { customerConverter.mapEntityToCustomer(it) }
                    }
                )
            },
            totalCount = 0,
            currentPage = 0,
            totalPages = 0,
            pageSize = 0
        )
    }

}

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

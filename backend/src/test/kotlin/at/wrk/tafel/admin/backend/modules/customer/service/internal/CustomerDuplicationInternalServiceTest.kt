package at.wrk.tafel.admin.backend.modules.customer.service.internal

import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.api.model.Customer
import at.wrk.tafel.admin.backend.modules.customer.service.internal.converter.CustomerConverter
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper

@ExtendWith(MockKExtension::class)
internal class CustomerDuplicationInternalServiceTest {

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var customerConverter: CustomerConverter

    @RelaxedMockK
    private lateinit var jdbcTemplate: JdbcTemplate

    @InjectMockKs
    private lateinit var service: CustomerDuplicationService

    @Test
    fun `fetch duplicates and data mapped properly`() {
        val page = 3
        val pageSize = 1
        val totalCount = 100L

        val customerEntity1 = mockk<CustomerEntity>(relaxed = true)
        val customer1 = mockk<Customer>(relaxed = true)
        every { customerRepository.findByCustomerId(1) } returns customerEntity1
        every { customerConverter.mapEntityToCustomer(customerEntity1) } returns customer1

        val customerEntity2 = mockk<CustomerEntity>(relaxed = true)
        val customer2 = mockk<Customer>(relaxed = true)
        every { customerRepository.findByCustomerId(2) } returns customerEntity2
        every { customerConverter.mapEntityToCustomer(customerEntity2) } returns customer2

        val customerEntity3 = mockk<CustomerEntity>(relaxed = true)
        val customer3 = mockk<Customer>(relaxed = true)
        every { customerRepository.findByCustomerId(3) } returns customerEntity3
        every { customerConverter.mapEntityToCustomer(customerEntity3) } returns customer3

        val customerEntity4 = mockk<CustomerEntity>(relaxed = true)
        val customer4 = mockk<Customer>(relaxed = true)
        every { customerRepository.findByCustomerId(4) } returns customerEntity4
        every { customerConverter.mapEntityToCustomer(customerEntity4) } returns customer4

        every { jdbcTemplate.query(any<String>(), any<RowMapper<*>>()) } returns listOf(totalCount) andThen listOf(
            CustomerDuplicateEntry(
                customerId = 1,
                compareCustomerIdList = "2,3,4"
            )
        )

        val result = service.findDuplicates(page)

        assertThat(result.items).isEqualTo(
            listOf(
                CustomerDuplicateSearchResultItem(
                    customer = customer1,
                    similarCustomers = listOf(customer2, customer3, customer4)
                )
            )
        )
        assertThat(result.totalCount).isEqualTo(totalCount)
        assertThat(result.pageSize).isEqualTo(pageSize)
        assertThat(result.currentPage).isEqualTo(page)
        assertThat(result.totalPages).isEqualTo(totalCount / pageSize)
    }

}

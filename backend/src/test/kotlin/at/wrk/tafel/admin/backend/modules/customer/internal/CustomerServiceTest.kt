package at.wrk.tafel.admin.backend.modules.customer.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.customer.Customer
import at.wrk.tafel.admin.backend.modules.customer.CustomerAdditionalPerson
import at.wrk.tafel.admin.backend.modules.customer.CustomerPdfType
import at.wrk.tafel.admin.backend.modules.customer.internal.converter.CustomerConverter
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.internal.masterdata.CustomerPdfService
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

@ExtendWith(MockKExtension::class)
class CustomerServiceTest {

    @RelaxedMockK
    private lateinit var incomeValidatorService: IncomeValidatorService

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var customerPdfService: CustomerPdfService

    @RelaxedMockK
    private lateinit var customerConverter: CustomerConverter

    @InjectMockKs
    private lateinit var service: CustomerService

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        every { countryRepository.findById(testCountry1.id!!) } returns Optional.of(testCountry1)
        every { userRepository.findByUsername(testUserEntity.username!!) } returns testUserEntity
    }

    @Test
    fun `validate customer`() {
        val testCustomer = mockk<Customer>(relaxed = true)
        every { testCustomer.birthDate } returns LocalDate.now().minusYears(30)
        every { testCustomer.income } returns BigDecimal("1000")

        val additionalPerson1 = mockk<CustomerAdditionalPerson>(relaxed = true)
        every { additionalPerson1.birthDate } returns LocalDate.now().minusYears(5)
        every { additionalPerson1.income } returns BigDecimal("100")
        every { additionalPerson1.excludeFromHousehold } returns false
        every { additionalPerson1.receivesFamilyBonus } returns false

        val additionalPerson2 = mockk<CustomerAdditionalPerson>(relaxed = true)
        every { additionalPerson2.birthDate } returns LocalDate.now().minusYears(2)
        every { additionalPerson2.income } returns null
        every { additionalPerson2.excludeFromHousehold } returns true
        every { additionalPerson2.receivesFamilyBonus } returns true

        val additionalPersons = listOf(additionalPerson1, additionalPerson2)
        every { testCustomer.additionalPersons } returns additionalPersons

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.validate(testCustomer)

        assertThat(result).isEqualTo(
            IncomeValidatorResult(
                valid = true,
                totalSum = BigDecimal("1"),
                limit = BigDecimal("2"),
                toleranceValue = BigDecimal("3"),
                amountExceededLimit = BigDecimal("4")
            )
        )

        val incomeValidatorPersonsSlot = slot<List<IncomeValidatorPerson>>()
        verify { incomeValidatorService.validate(capture(incomeValidatorPersonsSlot)) }

        val incomeValidatorPersons = incomeValidatorPersonsSlot.captured

        val firstPerson = incomeValidatorPersons.first()
        assertThat(firstPerson).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(5),
                monthlyIncome = BigDecimal("100"),
                excludeFromIncomeCalculation = false,
                receivesFamilyBonus = false
            )
        )

        val secondPerson = incomeValidatorPersons[1]
        assertThat(secondPerson).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(2),
                excludeFromIncomeCalculation = true,
                receivesFamilyBonus = true
            )
        )

        val thirdPerson = incomeValidatorPersons[2]
        assertThat(thirdPerson).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(30),
                monthlyIncome = BigDecimal("1000"),
                excludeFromIncomeCalculation = false
            )
        )
    }

    @Test
    fun `existsByCustomerId`() {
        every { service.existsByCustomerId(any()) } returns true

        val result = service.existsByCustomerId(1)

        assertThat(result).isTrue
        verify { customerRepository.existsByCustomerId(1) }
    }

    @Test
    fun `findByCustomerId - not found`() {
        every { customerRepository.findByCustomerId(any()) } returns null

        val customer = service.findByCustomerId(1)

        assertThat(customer).isNull()
    }

    @Test
    fun `findByCustomerId - found`() {
        val testCustomerEntity = mockk<CustomerEntity>(relaxed = true)
        every { customerRepository.findByCustomerId(any()) } returns testCustomerEntity

        val testCustomer = mockk<Customer>(relaxed = true)
        every { customerConverter.mapEntityToCustomer(testCustomerEntity) } returns testCustomer

        val customer = service.findByCustomerId(1)

        assertThat(customer).isEqualTo(testCustomer)
    }

    @Test
    fun `create customer`() {
        val testCustomer = mockk<Customer>(relaxed = true)
        val testCustomerEntity = mockk<CustomerEntity>(relaxed = true)

        every { customerConverter.mapEntityToCustomer(testCustomerEntity) } returns testCustomer
        every { customerConverter.mapCustomerToEntity(testCustomer) } returns testCustomerEntity
        every { customerRepository.save(any()) } returns testCustomerEntity

        val result = service.createCustomer(testCustomer)

        assertThat(result).isEqualTo(testCustomer)

        verify(exactly = 1) { customerRepository.save(any()) }
        verify(exactly = 1) { customerConverter.mapEntityToCustomer(testCustomerEntity) }
        verify(exactly = 1) { customerConverter.mapCustomerToEntity(testCustomer) }
    }

    @Test
    fun `update customer is valid`() {
        val customerId = 123L

        val testCustomerUpdate = mockk<Customer>(relaxed = true)
        every { testCustomerUpdate.id } returns customerId

        val testCustomerEntity = CustomerEntity()
        every { customerRepository.getReferenceByCustomerId(customerId) } returns testCustomerEntity
        every { customerConverter.mapCustomerToEntity(any(), any()) } returns testCustomerEntity
        every { customerConverter.mapEntityToCustomer(testCustomerEntity) } returns testCustomerUpdate
        every { customerRepository.save(any()) } returns testCustomerEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.updateCustomer(testCustomerUpdate.id!!, testCustomerUpdate)

        assertThat(result).isEqualTo(testCustomerUpdate)
        verify(exactly = 1) { customerRepository.save(testCustomerEntity) }
        verify(exactly = 1) { customerConverter.mapCustomerToEntity(testCustomerUpdate, testCustomerEntity) }
    }

    @Test
    fun `update customer is invalid`() {
        val customerId = 123L

        val testCustomer = mockk<Customer>(relaxed = true)
        every { testCustomer.id } returns customerId

        val testCustomerUpdate = mockk<Customer>(relaxed = true)
        every { testCustomerUpdate.id } returns customerId

        val testCustomerEntity = CustomerEntity()
        every { customerRepository.getReferenceByCustomerId(customerId) } returns testCustomerEntity
        every { customerConverter.mapCustomerToEntity(any(), any()) } returns testCustomerEntity
        every { customerConverter.mapEntityToCustomer(testCustomerEntity) } returns testCustomer
        every { customerRepository.save(any()) } returns testCustomerEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.updateCustomer(testCustomer.id!!, testCustomerUpdate)

        assertThat(result).isEqualTo(testCustomer)

        val savedCustomerSlot = slot<CustomerEntity>()
        verify(exactly = 1) { customerRepository.save(capture(savedCustomerSlot)) }

        val savedCustomer = savedCustomerSlot.captured
        assertThat(savedCustomer.validUntil).isEqualTo(LocalDate.now().minusDays(1))

        verify(exactly = 1) { customerConverter.mapCustomerToEntity(any(), any()) }
    }

    @Test
    fun `get customers`() {
        val testCustomerEntity1 = mockk<CustomerEntity>(relaxed = true)
        val testCustomerEntity2 = mockk<CustomerEntity>(relaxed = true)

        val testCustomer = mockk<Customer>(relaxed = true)
        every { customerConverter.mapEntityToCustomer(any()) } returns testCustomer

        val selectedPage = 3
        val pageRequest = PageRequest.of(selectedPage - 1, 25)
        val page = PageImpl(listOf(testCustomerEntity1, testCustomerEntity2), pageRequest, 123)
        every { customerRepository.findAll(any<Specification<CustomerEntity>>(), pageRequest) } returns page

        val searchResult = service.getCustomers(page = selectedPage, postProcessing = true)

        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(5)
        assertThat(searchResult.totalCount).isEqualTo(page.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        val customers = searchResult.items
        assertThat(customers).hasSize(2)
        assertThat(customers[0]).isEqualTo(testCustomer)

        verify(exactly = 1) { customerRepository.findAll(any<Specification<CustomerEntity>>(), pageRequest) }
    }

    @Test
    fun `generate pdf customer - not found`() {
        every { customerRepository.findByCustomerId(any()) } returns null

        val result = service.generatePdf(1, CustomerPdfType.MASTERDATA)

        assertThat(result).isNull()
    }

    @Test
    fun `generate pdf customer - found`() {
        val testCustomerEntity = mockk<CustomerEntity>(relaxed = true)
        every { testCustomerEntity.customerId } returns 100
        every { testCustomerEntity.firstname } returns "max"
        every { testCustomerEntity.lastname } returns "mustermann"

        val pdfBytes = ByteArray(10)
        every { customerRepository.findByCustomerId(any()) } returns testCustomerEntity
        every { customerPdfService.generateMasterdataPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, CustomerPdfType.MASTERDATA)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("stammdaten-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
    }

    @Test
    fun `delete customer by customerId`() {
        val customerId = 123L

        service.deleteCustomerByCustomerId(customerId)

        verify(exactly = 1) { customerRepository.deleteByCustomerId(customerId) }
    }

}

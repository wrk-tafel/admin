package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.masterdata.CustomerPdfService
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
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
    private lateinit var customerAddPersonRepository: CustomerAddPersonRepository

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var customerPdfService: CustomerPdfService

    @InjectMockKs
    private lateinit var service: CustomerService

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns Optional.of(testUserEntity)
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        every { countryRepository.findById(testCountry.id!!) } returns Optional.of(testCountry)
    }

    @Test
    fun `validate customer`() {
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

        verify {
            incomeValidatorService.validate(
                withArg {
                    assertThat(it[0])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(30),
                                monthlyIncome = BigDecimal("1000")
                            )
                        )
                    assertThat(it[1])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(5),
                                monthlyIncome = BigDecimal("100")
                            )
                        )
                    assertThat(it[2])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(2)
                            )
                        )
                }
            )
        }
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
        every { customerRepository.findByCustomerId(any()) } returns Optional.empty()

        val customer = service.findByCustomerId(1)

        assertThat(customer).isNull()
    }

    @Test
    fun `findByCustomerId - found`() {
        every { customerRepository.findByCustomerId(any()) } returns Optional.of(testCustomerEntity1)

        val customer = service.findByCustomerId(1)

        assertThat(customer).isEqualTo(testCustomer)
    }

    @Test
    fun `create customer`() {
        every { customerRepository.save(any()) } returns testCustomerEntity1
        every { customerAddPersonRepository.findById(testCustomerEntity1.additionalPersons[0].id!!) } returns Optional.of(
            testCustomerEntity1.additionalPersons[0]
        )
        every { customerAddPersonRepository.findById(testCustomerEntity1.additionalPersons[1].id!!) } returns Optional.of(
            testCustomerEntity1.additionalPersons[1]
        )

        val result = service.createCustomer(testCustomer)

        assertThat(result).isEqualTo(testCustomer)

        verify(exactly = 1) {
            customerRepository.save(any())
        }
    }

    @Test
    fun `update customer`() {
        every { customerRepository.existsByCustomerId(any()) } returns true
        every { customerRepository.save(any()) } returns testCustomerEntity1

        val updatedCustomer = testCustomer.copy(
            lastname = "updated-lastname",
            firstname = "updated-firstname",
            birthDate = LocalDate.now(),
            employer = "updated-employer",
            income = BigDecimal.TEN,
            additionalPersons = emptyList()
        )
        every { customerRepository.getReferenceByCustomerId(testCustomer.id!!) } returns testCustomerEntity1

        val updatedWithIssuer = updatedCustomer.copy(
            issuer = CustomerIssuer(
                personnelNumber = "12345",
                firstname = "first",
                lastname = "last"
            )
        )

        val result = service.updateCustomer(testCustomer.id!!, updatedWithIssuer)

        assertThat(result).isEqualTo(updatedCustomer)

        verify(exactly = 1) {
            customerRepository.save(withArg {
                // issuer shouldn't be updated
                assertThat(it.issuer?.personnelNumber).isEqualTo(testCustomer.issuer?.personnelNumber)
            })
        }
    }

    @Test
    fun `get all customers`() {
        every { customerRepository.findAll() } returns listOf(testCustomerEntity1, testCustomerEntity2)

        val customers = service.getCustomers()

        assertThat(customers).hasSize(2)
        assertThat(customers[0]).isEqualTo(testCustomer)
    }

    @Test
    fun `get customer by firstname`() {
        every { customerRepository.findAllByFirstnameContainingIgnoreCase(any()) } returns listOf(testCustomerEntity1)

        val customers = service.getCustomers(firstname = "firstname")

        assertThat(customers).hasSize(1)
        assertThat(customers[0]).isEqualTo(testCustomer)
    }

    @Test
    fun `get customer by lastname`() {
        every { customerRepository.findAllByLastnameContainingIgnoreCase(any()) } returns listOf(testCustomerEntity1)

        val customers = service.getCustomers(lastname = "lastname")

        assertThat(customers).hasSize(1)
        assertThat(customers[0]).isEqualTo(testCustomer)
    }

    @Test
    fun `find customer by firstname and lastname`() {
        every {
            customerRepository.findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(any(), any())
        } returns listOf(testCustomerEntity1, testCustomerEntity2)

        val customers = service.getCustomers(firstname = "firstname", lastname = "lastname")

        assertThat(customers).hasSize(2)
        assertThat(customers[0]).isEqualTo(testCustomer)
    }

    @Test
    fun `generate pdf customer - not found`() {
        every { customerRepository.findByCustomerId(any()) } returns Optional.empty()

        val result = service.generatePdf(1, CustomerPdfType.MASTERDATA)

        assertThat(result).isNull()
    }

    @Test
    fun `generate pdf customer - found`() {
        val pdfBytes = ByteArray(10)
        every { customerRepository.findByCustomerId(any()) } returns Optional.of(testCustomerEntity1)
        every { customerPdfService.generateMasterdataPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, CustomerPdfType.MASTERDATA)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("stammdaten-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
    }

}

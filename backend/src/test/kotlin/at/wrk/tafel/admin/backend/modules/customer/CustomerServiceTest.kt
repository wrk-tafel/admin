package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.masterdata.CustomerPdfService
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
import java.time.ZonedDateTime
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
                                monthlyIncome = BigDecimal("1000"),
                                excludeFromIncomeCalculation = false
                            )
                        )
                    assertThat(it[1])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(5),
                                monthlyIncome = BigDecimal("100"),
                                excludeFromIncomeCalculation = false
                            )
                        )
                    assertThat(it[2])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(2),
                                excludeFromIncomeCalculation = true
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
        every { customerRepository.findByCustomerId(any()) } returns null

        val customer = service.findByCustomerId(1)

        assertThat(customer).isNull()
    }

    @Test
    fun `findByCustomerId - found`() {
        every { customerRepository.findByCustomerId(any()) } returns testCustomerEntity1

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
    // TODO improve test (asserts)
    fun `update customer`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = ZonedDateTime.now()
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            country = testCountry
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()
            locked = false

            val addPerson1 = CustomerAddPersonEntity()
            addPerson1.id = 2
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry
            addPerson1.excludeFromHousehold = false

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry
            addPerson2.excludeFromHousehold = false

            additionalPersons = mutableListOf(addPerson1, addPerson2)
        }

        every { customerRepository.existsByCustomerId(any()) } returns true
        every { customerRepository.save(any()) } returns testCustomerEntity1
        every { customerAddPersonRepository.findById(testCustomerEntity1.additionalPersons[0].id!!) } returns Optional.of(
            testCustomerEntity1.additionalPersons[0]
        )

        val updatedCustomer = testCustomer.copy(
            lastname = "updated-lastname",
            firstname = "updated-firstname",
            birthDate = LocalDate.now(),
            employer = "updated-employer",
            income = BigDecimal.TEN,
            additionalPersons = listOf(
                testCustomer.additionalPersons[0].copy(
                    excludeFromHousehold = true
                )
            )
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
    fun `update customer and lock`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = ZonedDateTime.now()
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            country = testCountry
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()

            val addPerson1 = CustomerAddPersonEntity()
            addPerson1.id = 2
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry

            additionalPersons = mutableListOf()
        }

        every { customerRepository.existsByCustomerId(any()) } returns true
        every { customerRepository.save(any()) } returns testCustomerEntity1

        val updatedCustomer = testCustomer.copy(
            locked = true,
            lockReason = "locked due to lorem ipsum",
            additionalPersons = emptyList()
        )
        every { customerRepository.getReferenceByCustomerId(testCustomer.id!!) } returns testCustomerEntity1

        service.updateCustomer(testCustomer.id!!, updatedCustomer)

        verify(exactly = 1) {
            customerRepository.save(withArg {
                assertThat(it.locked).isTrue()
                assertThat(it.lockedAt).isNotNull()
                assertThat(it.lockReason).isEqualTo(updatedCustomer.lockReason)
                assertThat(it.lockedBy).isEqualTo(testUserEntity)
            })
        }
    }

    @Test
    fun `update customer and unlock`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = ZonedDateTime.now()
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            country = testCountry
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()
            locked = true
            lockedAt = ZonedDateTime.now()
            lockedBy = testUserEntity
            lockReason = "locked due to lorem ipsum"

            val addPerson1 = CustomerAddPersonEntity()
            addPerson1.id = 2
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.country = testCountry

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry

            additionalPersons = mutableListOf()
        }

        every { customerRepository.existsByCustomerId(any()) } returns true
        every { customerRepository.save(any()) } returns testCustomerEntity1

        val updatedCustomer = testCustomer.copy(
            locked = false,
            additionalPersons = emptyList()
        )
        every { customerRepository.getReferenceByCustomerId(testCustomer.id!!) } returns testCustomerEntity1

        val result = service.updateCustomer(testCustomer.id!!, updatedCustomer)

        assertThat(result).isEqualTo(updatedCustomer)

        verify(exactly = 1) {
            customerRepository.save(withArg {
                assertThat(it.locked).isFalse()
                assertThat(it.lockedAt).isNull()
                assertThat(it.lockReason).isNull()
                assertThat(it.lockedBy).isNull()
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
        every { customerRepository.findByCustomerId(any()) } returns null

        val result = service.generatePdf(1, CustomerPdfType.MASTERDATA)

        assertThat(result).isNull()
    }

    @Test
    fun `generate pdf customer - found`() {
        val pdfBytes = ByteArray(10)
        every { customerRepository.findByCustomerId(any()) } returns testCustomerEntity1
        every { customerPdfService.generateMasterdataPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, CustomerPdfType.MASTERDATA)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("stammdaten-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
    }

}

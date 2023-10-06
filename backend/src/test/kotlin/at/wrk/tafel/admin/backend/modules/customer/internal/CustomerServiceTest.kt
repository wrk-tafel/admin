package at.wrk.tafel.admin.backend.modules.customer.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.base.testCountry
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.internal.masterdata.CustomerPdfService
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
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

    private lateinit var testCustomer: Customer
    private lateinit var testCustomerEntity1: CustomerEntity
    private lateinit var testCustomerEntity2: CustomerEntity

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        every { countryRepository.findById(testCountry.id!!) } returns Optional.of(testCountry)

        testCustomer = Customer(
            id = 100,
            issuer = CustomerIssuer(
                personnelNumber = "test-personnelnumber",
                firstname = "test-firstname",
                lastname = "test-lastname"
            ),
            issuedAt = LocalDate.now(),
            firstname = "Max",
            lastname = "Mustermann",
            birthDate = LocalDate.now().minusYears(30),
            country = Country(
                id = 1,
                code = "AT",
                name = "Österreich"
            ),
            telephoneNumber = "0043660123123",
            email = "test@mail.com",
            address = CustomerAddress(
                street = "Test-Straße",
                houseNumber = "100",
                stairway = "1",
                door = "21",
                postalCode = 1010,
                city = "Wien"
            ),
            employer = "Employer 123",
            income = BigDecimal("1000"),
            incomeDue = LocalDate.now(),
            validUntil = LocalDate.now(),
            locked = false,
            additionalPersons = listOf(
                CustomerAdditionalPerson(
                    id = 2,
                    firstname = "Add pers 1",
                    lastname = "Add pers 1",
                    birthDate = LocalDate.now().minusYears(5),
                    income = BigDecimal("100"),
                    incomeDue = LocalDate.now(),
                    receivesFamilyBonus = false,
                    country = Country(
                        id = 1,
                        code = "AT",
                        name = "Österreich"
                    ),
                    excludeFromHousehold = false
                ),
                CustomerAdditionalPerson(
                    id = 3,
                    firstname = "Add pers 2",
                    lastname = "Add pers 2",
                    birthDate = LocalDate.now().minusYears(2),
                    receivesFamilyBonus = true,
                    country = Country(
                        id = 1,
                        code = "AT",
                        name = "Österreich"
                    ),
                    excludeFromHousehold = true
                )
            )
        )

        testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = LocalDateTime.now()
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
            addPerson1.receivesFamilyBonus = false
            addPerson1.country = testCountry
            addPerson1.excludeFromHousehold = false

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.country = testCountry
            addPerson2.receivesFamilyBonus = true
            addPerson2.excludeFromHousehold = true

            additionalPersons = mutableListOf(addPerson1, addPerson2)
        }

        testCustomerEntity2 = CustomerEntity().apply {
            id = 2
            createdAt = LocalDateTime.now()
            customerId = 200
            lastname = "Mustermann"
            firstname = "Max 2"
            birthDate = LocalDate.now().minusYears(22)
            country = testCountry
            addressStreet = "Test-Straße 2"
            addressHouseNumber = "200"
            addressStairway = "1-2"
            addressPostalCode = 1010
            addressDoor = "21-2"
            addressCity = "Wien 2"
            telephoneNumber = "0043660123123"
            email = "test2@mail.com"
            employer = "Employer 123-2"
            income = BigDecimal("2000")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now()
            locked = false
        }
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
                                birthDate = LocalDate.now().minusYears(5),
                                monthlyIncome = BigDecimal("100"),
                                excludeFromIncomeCalculation = false,
                                receivesFamilyBonus = false
                            )
                        )
                    assertThat(it[1])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(2),
                                excludeFromIncomeCalculation = true,
                                receivesFamilyBonus = true
                            )
                        )
                    assertThat(it[2])
                        .isEqualTo(
                            IncomeValidatorPerson(
                                birthDate = LocalDate.now().minusYears(30),
                                monthlyIncome = BigDecimal("1000"),
                                excludeFromIncomeCalculation = false
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
    fun `create customer with income zero is set to null`() {
        every { customerRepository.save(any()) } returns testCustomerEntity1
        every { customerAddPersonRepository.findById(testCustomerEntity1.additionalPersons[0].id!!) } returns Optional.of(
            testCustomerEntity1.additionalPersons[0]
        )
        every { customerAddPersonRepository.findById(testCustomerEntity1.additionalPersons[1].id!!) } returns Optional.of(
            testCustomerEntity1.additionalPersons[1]
        )

        val customer = testCustomer.copy(
            income = BigDecimal.ZERO, additionalPersons = listOf(
                testCustomer.additionalPersons[0].copy(income = BigDecimal.ZERO),
                testCustomer.additionalPersons[1]
            )
        )

        service.createCustomer(customer)

        verify(exactly = 1) {
            customerRepository.save(withArg {
                assertThat(it.income).isNull()
                assertThat(it.additionalPersons[0].income).isNull()
            })
        }
    }

    @Test
    fun `update customer`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = LocalDateTime.now()
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
            validUntil = LocalDate.now().minusDays(30)
            prolongedAt = null
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
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val updatedCustomer = testCustomer.copy(
            lastname = "updated-lastname",
            firstname = "updated-firstname",
            birthDate = LocalDate.now(),
            employer = "updated-employer",
            income = BigDecimal.TEN,
            validUntil = LocalDate.now().plusYears(1),
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
                assertThat(it.prolongedAt).isEqualTo(testCustomerEntity1.prolongedAt)
            })
        }
    }

    @Test
    fun `update customer and lock`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = LocalDateTime.now()
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
        val testValidUntil = LocalDate.now()
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = LocalDateTime.now()
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
            validUntil = testValidUntil
            prolongedAt = null
            locked = true
            lockedAt = LocalDateTime.now()
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

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.updateCustomer(testCustomer.id!!, updatedCustomer)

        assertThat(result).isEqualTo(updatedCustomer)

        verify(exactly = 1) {
            customerRepository.save(withArg {
                assertThat(it.locked).isFalse()
                assertThat(it.lockedAt).isNull()
                assertThat(it.lockReason).isNull()
                assertThat(it.lockedBy).isNull()
                assertThat(it.prolongedAt).isNull()
            })
        }
    }

    @Test
    fun `update customer and prolongedAt is filled`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = LocalDateTime.now()
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
            validUntil = LocalDate.now().minusDays(5)
            prolongedAt = null
            additionalPersons = mutableListOf()
        }

        every { customerRepository.existsByCustomerId(any()) } returns true
        every { customerRepository.save(any()) } returns testCustomerEntity1

        val updatedCustomer = testCustomer.copy(
            validUntil = LocalDate.now().plusYears(1),
            additionalPersons = emptyList()
        )

        every { customerRepository.getReferenceByCustomerId(testCustomer.id!!) } returns testCustomerEntity1

        service.updateCustomer(testCustomer.id!!, updatedCustomer)

        val updatedCustomerSlot = slot<CustomerEntity>()
        verify(exactly = 1) {
            customerRepository.save(capture(updatedCustomerSlot))
        }
        assertThat(updatedCustomerSlot.captured.prolongedAt).isNotNull()
    }

    @Test
    fun `update customer exceeding limit`() {
        val testCustomerEntity1 = CustomerEntity().apply {
            id = 1
            issuer = testUserEntity
            createdAt = LocalDateTime.now()
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
            income = BigDecimal("7777")
            incomeDue = LocalDate.now()
            validUntil = LocalDate.now().minusDays(5)
            prolongedAt = null
            additionalPersons = mutableListOf()
        }

        every { customerRepository.existsByCustomerId(any()) } returns true
        every { customerRepository.save(any()) } returns testCustomerEntity1

        val updatedCustomer = testCustomer.copy(
            validUntil = LocalDate.now().plusYears(1),
            additionalPersons = emptyList()
        )

        every { customerRepository.getReferenceByCustomerId(testCustomer.id!!) } returns testCustomerEntity1

        service.updateCustomer(testCustomer.id!!, updatedCustomer)

        val updatedCustomerSlot = slot<CustomerEntity>()
        verify(exactly = 1) {
            customerRepository.save(capture(updatedCustomerSlot))
        }
        assertThat(updatedCustomerSlot.captured.validUntil).isEqualTo(LocalDate.now().minusDays(1))
    }

    @Test
    fun `get customers`() {
        every { customerRepository.findAll(any<Specification<CustomerEntity>>()) } returns listOf(
            testCustomerEntity1,
            testCustomerEntity2
        )

        val customers = service.getCustomers()

        assertThat(customers).hasSize(2)
        assertThat(customers[0]).isEqualTo(testCustomer)

        verify(exactly = 1) { customerRepository.findAll(any<Specification<CustomerEntity>>()) }
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

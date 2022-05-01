package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.masterdata.MasterdataPdfService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

@ExtendWith(MockKExtension::class)
class CustomerControllerTest {

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var masterdataPdfService: MasterdataPdfService

    @RelaxedMockK
    private lateinit var incomeValidatorService: IncomeValidatorService

    @InjectMockKs
    private lateinit var controller: CustomerController

    private lateinit var testCountry: CountryEntity

    private val testCustomer = Customer(
        id = 100,
        firstname = "Max",
        lastname = "Mustermann",
        birthDate = LocalDate.now().minusYears(30),
        country = Country(
            id = 1,
            code = "AT",
            name = "Österreich"
        ),
        telephoneNumber = 43660123123,
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
        additionalPersons = listOf(
            CustomerAdditionalPerson(
                id = 2,
                firstname = "Add pers 1",
                lastname = "Add pers 1",
                birthDate = LocalDate.now().minusYears(5),
                income = BigDecimal("100")
            ),
            CustomerAdditionalPerson(
                id = 3,
                firstname = "Add pers 2",
                lastname = "Add pers 2",
                birthDate = LocalDate.now().minusYears(2),
                income = BigDecimal("200")
            )
        )
    )

    private val testCustomerEntity = CustomerEntity()

    @BeforeEach
    fun beforeEach() {
        testCountry = CountryEntity()
        testCountry.id = 1
        testCountry.code = "AT"
        testCountry.name = "Österreich"

        every { countryRepository.findById(testCountry.id!!) } returns Optional.of(testCountry)

        testCustomerEntity.id = 1
        testCustomerEntity.customerId = 100
        testCustomerEntity.lastname = "Mustermann"
        testCustomerEntity.firstname = "Max"
        testCustomerEntity.birthDate = LocalDate.now().minusYears(30)
        testCustomerEntity.country = testCountry
        testCustomerEntity.addressStreet = "Test-Straße"
        testCustomerEntity.addressHouseNumber = "100"
        testCustomerEntity.addressStairway = "1"
        testCustomerEntity.addressPostalCode = 1010
        testCustomerEntity.addressDoor = "21"
        testCustomerEntity.addressCity = "Wien"
        testCustomerEntity.telephoneNumber = 43660123123
        testCustomerEntity.email = "test@mail.com"
        testCustomerEntity.employer = "Employer 123"
        testCustomerEntity.income = BigDecimal("1000")
        testCustomerEntity.incomeDue = LocalDate.now()

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 2
        addPerson1.lastname = "Add pers 1"
        addPerson1.firstname = "Add pers 1"
        addPerson1.birthDate = LocalDate.now().minusYears(5)
        addPerson1.income = BigDecimal("100")

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 3
        addPerson2.lastname = "Add pers 2"
        addPerson2.firstname = "Add pers 2"
        addPerson2.birthDate = LocalDate.now().minusYears(2)
        addPerson2.income = BigDecimal("200")

        testCustomerEntity.additionalPersons = listOf(addPerson1, addPerson2)
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

        val response = controller.validate(testCustomer)

        assertThat(response).isEqualTo(
            ValidateCustomerResponse(
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
                                birthDate = LocalDate.now().minusYears(2),
                                monthlyIncome = BigDecimal("200")
                            )
                        )
                }
            )
        }
    }

    @Test
    fun `create customer`() {
        every { customerRepository.save(any()) } returns testCustomerEntity

        val response = controller.createCustomer(testCustomer)

        assertThat(response).isEqualTo(testCustomer)

        verify {
            customerRepository.save(any())
        }
    }


    @Test
    fun `generate pdf customer unknown`() {
        every { customerRepository.findByCustomerId(any()) } returns Optional.empty()

        val response = controller.generateMasterdataPdf(1)

        assertThat(response).isNotNull
        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `generate pdf customer found`() {
        val pdfBytes = ByteArray(10)
        every { customerRepository.findByCustomerId(any()) } returns Optional.of(testCustomerEntity)
        every { masterdataPdfService.generatePdf(any()) } returns pdfBytes

        val response = controller.generateMasterdataPdf(1)

        assertThat(response).isNotNull
        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers[HttpHeaders.CONTENT_DISPOSITION]).isEqualTo(listOf("inline; filename=stammdaten-100-mustermann-max.pdf"))
        assertThat(response.body?.contentLength()).isEqualTo(pdfBytes.size.toLong())
    }

}

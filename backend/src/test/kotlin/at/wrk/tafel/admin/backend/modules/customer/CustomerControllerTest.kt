package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

@ExtendWith(MockKExtension::class)
class CustomerControllerTest {

    @RelaxedMockK
    private lateinit var service: CustomerService

    @InjectMockKs
    private lateinit var controller: CustomerController

    private lateinit var testCustomer: Customer

    @BeforeEach
    fun beforeEach() {
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
            receivesFamilyBonus = true,
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
    }

    @Test
    fun `validate customer`() {
        every { service.validate(any()) } returns IncomeValidatorResult(
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
            service.validate(testCustomer)
        }
    }

    @Test
    fun `create customer - given id and exists already`() {
        every { service.existsByCustomerId(testCustomer.id!!) } returns true

        val exception = assertThrows<TafelValidationException> { controller.createCustomer(testCustomer) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 bereits vorhanden!")
    }

    @Test
    fun `create customer - missing id so the customer should be created`() {
        every { service.existsByCustomerId(testCustomer.id!!) } returns false

        controller.createCustomer(testCustomer)

        verify { service.createCustomer(testCustomer) }
    }

    @Test
    fun `update customer - doesnt exist`() {
        every { service.existsByCustomerId(testCustomer.id!!) } returns false

        val exception =
            assertThrows<TafelValidationException> { controller.updateCustomer(testCustomer.id!!, testCustomer) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `update customer - exists and should be updated`() {
        every { service.existsByCustomerId(testCustomer.id!!) } returns true

        controller.updateCustomer(testCustomer.id!!, testCustomer)

        verify { service.updateCustomer(testCustomer.id!!, testCustomer) }
    }

    @Test
    fun `get customer - doesnt exist`() {
        every { service.findByCustomerId(testCustomer.id!!) } returns null

        val exception =
            assertThrows<TafelValidationException> { controller.getCustomer(testCustomer.id!!) }

        assertThat(exception.message).isEqualTo("Kunde Nr. ${testCustomer.id} nicht gefunden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        verify { service.findByCustomerId(testCustomer.id!!) }
    }

    @Test
    fun `get customer - exists`() {
        every { service.findByCustomerId(testCustomer.id!!) } returns testCustomer

        val customer = controller.getCustomer(testCustomer.id!!)

        verify { service.findByCustomerId(testCustomer.id!!) }
        assertThat(customer).isEqualTo(testCustomer)
    }

    @Test
    fun `delete customer - doesnt exist`() {
        every { service.existsByCustomerId(testCustomer.id!!) } returns false

        val exception =
            assertThrows<TafelValidationException> { controller.deleteCustomer(testCustomer.id!!) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        verify { service.existsByCustomerId(testCustomer.id!!) }
    }

    @Test
    fun `delete customer - exists`() {
        every { service.existsByCustomerId(testCustomer.id!!) } returns true

        controller.deleteCustomer(testCustomer.id!!)

        verify { service.existsByCustomerId(testCustomer.id!!) }
    }

    @Test
    fun `get customers - mapped correctly`() {
        every { service.getCustomers(any(), any()) } returns listOf(testCustomer)

        val response = controller.getCustomers("first", "last")

        verify { service.getCustomers(any(), any()) }
        assertThat(response.items).hasSize(1)
    }

    @Test
    fun `generate pdf - no result`() {
        every { service.generatePdf(any(), any()) } returns null

        val exception = assertThrows<TafelValidationException> { controller.generatePdf(123, CustomerPdfType.COMBINED) }

        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Kunde Nr. 123 nicht vorhanden!")
    }

    @Test
    fun `generate pdf - result mapped`() {
        val testFilename = "file.pdf"
        every { service.generatePdf(any(), any()) } returns CustomerPdfResult(
            filename = testFilename,
            bytes = testFilename.toByteArray()
        )

        val response = controller.generatePdf(123, CustomerPdfType.COMBINED)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(
            response.headers.filter { it.key === HttpHeaders.CONTENT_TYPE }
                .map { it.value.first().toString() }.first()
        ).isEqualTo(MediaType.APPLICATION_PDF_VALUE)

        assertThat(
            response.headers.filter { it.key === HttpHeaders.CONTENT_DISPOSITION }
                .map { it.value.first().toString() }.first()
        ).isEqualTo("inline; filename=$testFilename")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(String(bodyBytes)).isEqualTo(testFilename)
    }

}

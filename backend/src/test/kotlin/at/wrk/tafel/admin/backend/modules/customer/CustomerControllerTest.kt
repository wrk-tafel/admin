package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.modules.base.country.Country
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerDuplicateSearchResult
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerDuplicateSearchResultItem
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerDuplicationService
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerPdfResult
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerSearchResult
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerService
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorResult
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
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

@ExtendWith(MockKExtension::class)
class CustomerControllerTest {

    @RelaxedMockK
    private lateinit var customerService: CustomerService

    @RelaxedMockK
    private lateinit var customerDuplicationService: CustomerDuplicationService

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
            gender = CustomerGender.FEMALE,
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
                    gender = CustomerGender.FEMALE,
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
                    gender = CustomerGender.MALE,
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
        every { customerService.validate(any()) } returns IncomeValidatorResult(
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
            customerService.validate(testCustomer)
        }
    }

    @Test
    fun `create customer - given id and exists already`() {
        every { customerService.existsByCustomerId(testCustomer.id!!) } returns true

        val exception = assertThrows<TafelValidationException> { controller.createCustomer(testCustomer) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 bereits vorhanden!")
    }

    @Test
    fun `create customer - missing id so the customer should be created`() {
        every { customerService.existsByCustomerId(testCustomer.id!!) } returns false

        controller.createCustomer(testCustomer)

        verify { customerService.createCustomer(testCustomer) }
    }

    @Test
    fun `update customer - doesnt exist`() {
        every { customerService.existsByCustomerId(testCustomer.id!!) } returns false

        val exception =
            assertThrows<TafelValidationException> { controller.updateCustomer(testCustomer.id!!, testCustomer) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `update customer - exists and should be updated`() {
        every { customerService.existsByCustomerId(testCustomer.id!!) } returns true

        controller.updateCustomer(testCustomer.id!!, testCustomer)

        verify { customerService.updateCustomer(testCustomer.id!!, testCustomer) }
    }

    @Test
    fun `get customer - doesnt exist`() {
        every { customerService.findByCustomerId(testCustomer.id!!) } returns null

        val exception =
            assertThrows<TafelValidationException> { controller.getCustomer(testCustomer.id!!) }

        assertThat(exception.message).isEqualTo("Kunde Nr. ${testCustomer.id} nicht gefunden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        verify { customerService.findByCustomerId(testCustomer.id!!) }
    }

    @Test
    fun `get customer - exists`() {
        every { customerService.findByCustomerId(testCustomer.id!!) } returns testCustomer

        val customer = controller.getCustomer(testCustomer.id!!)

        verify { customerService.findByCustomerId(testCustomer.id!!) }
        assertThat(customer).isEqualTo(testCustomer)
    }

    @Test
    fun `delete customer - doesnt exist`() {
        every { customerService.existsByCustomerId(testCustomer.id!!) } returns false

        val exception =
            assertThrows<TafelValidationException> { controller.deleteCustomer(testCustomer.id!!) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        verify { customerService.existsByCustomerId(testCustomer.id!!) }
    }

    @Test
    fun `delete customer - exists`() {
        every { customerService.existsByCustomerId(testCustomer.id!!) } returns true

        controller.deleteCustomer(testCustomer.id!!)

        verify { customerService.existsByCustomerId(testCustomer.id!!) }
    }

    @Test
    fun `get customers - mapped correctly`() {
        val testSearchResult = CustomerSearchResult(
            items = listOf(testCustomer),
            totalCount = 123,
            currentPage = 2,
            totalPages = 10,
            pageSize = 10
        )
        every {
            customerService.getCustomers(
                any(),
                any(),
                testSearchResult.currentPage,
                true,
                true
            )
        } returns testSearchResult

        val response = controller.getCustomers(
            firstname = " first ",
            lastname = " last ",
            page = testSearchResult.currentPage,
            postProcessing = true,
            costContribution = true
        )

        verify {
            customerService.getCustomers(
                firstname = "first",
                lastname = "last",
                page = testSearchResult.currentPage,
                postProcessing = true,
                costContribution = true
            )
        }
        assertThat(response.items).hasSize(1)
    }

    @Test
    fun `generate pdf - no result`() {
        every { customerService.generatePdf(any(), any()) } returns null

        val exception = assertThrows<TafelValidationException> { controller.generatePdf(123, CustomerPdfType.COMBINED) }

        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Kunde Nr. 123 nicht vorhanden!")
    }

    @Test
    fun `generate pdf - result mapped`() {
        val testFilename = "file.pdf"
        every { customerService.generatePdf(any(), any()) } returns CustomerPdfResult(
            filename = testFilename,
            bytes = testFilename.toByteArray()
        )

        val response = controller.generatePdf(123, CustomerPdfType.COMBINED)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo(MediaType.APPLICATION_PDF_VALUE)

        assertThat(
            response.headers.get(HttpHeaders.CONTENT_DISPOSITION)!!.first()
        ).isEqualTo("inline; filename=$testFilename")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(String(bodyBytes)).isEqualTo(testFilename)
    }

    @Test
    fun `get duplicates - result mapped`() {
        val page = 4
        val duplicationItem = CustomerDuplicateSearchResultItem(
            customer = mockk(relaxed = true),
            similarCustomers = mockk(relaxed = true)
        )

        val searchResult = CustomerDuplicateSearchResult(
            items = listOf(duplicationItem),
            totalCount = 100,
            currentPage = page,
            totalPages = 20,
            pageSize = 5
        )
        every { customerDuplicationService.findDuplicates(page) } returns searchResult

        val duplicatesResponse = controller.getDuplicates(page)

        assertThat(duplicatesResponse.items).hasSize(searchResult.items.size)
        assertThat(duplicatesResponse.items.first().customer).isEqualTo(searchResult.items.first().customer)
        assertThat(duplicatesResponse.items.first().similarCustomers).isEqualTo(searchResult.items.first().similarCustomers)

        assertThat(duplicatesResponse.currentPage).isEqualTo(searchResult.currentPage)
        assertThat(duplicatesResponse.pageSize).isEqualTo(searchResult.pageSize)
        assertThat(duplicatesResponse.totalPages).isEqualTo(searchResult.totalPages)
        assertThat(duplicatesResponse.totalCount).isEqualTo(searchResult.totalCount)
    }

}

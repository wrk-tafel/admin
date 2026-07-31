package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.modules.base.country.Country
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.household.internal.*
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class HouseholdControllerTest {

    @RelaxedMockK
    private lateinit var householdService: HouseholdService

    @RelaxedMockK
    private lateinit var householdDuplicationService: HouseholdDuplicationService

    @InjectMockKs
    private lateinit var controller: HouseholdController

    private lateinit var testHousehold: Household
    private val isSupervisor = false

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.getContext().authentication =
            at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication(
                "TOKEN",
                testUserEntity.username,
                true,
            )
        testHousehold = Household(
            id = 100,
            issuer = HouseholdIssuer(
                personnelNumber = "test-personnelnumber",
                firstname = "test-firstname",
                lastname = "test-lastname",
            ),
            issuedAt = LocalDate.now(),
            telephoneNumber = "0043660123123",
            email = "test@mail.com",
            address = HouseholdAddress(
                street = "Test-Straße",
                houseNumber = "100",
                stairway = "1",
                door = "21",
                postalCode = 1010,
                city = "Wien",
            ),
            validUntil = LocalDate.now(),
            locked = false,
            persons = listOf(
                Person(
                    id = 1,
                    isMainPerson = true,
                    firstname = "Max",
                    lastname = "Mustermann",
                    birthDate = LocalDate.now().minusYears(30),
                    gender = PersonGender.FEMALE,
                    country = Country(
                        id = 1,
                        code = "AT",
                        name = "Österreich",
                    ),
                    employer = "Employer 123",
                    income = BigDecimal("1000"),
                    incomeDue = LocalDate.now(),
                ),
                Person(
                    id = 2,
                    isMainPerson = false,
                    firstname = "Add pers 1",
                    lastname = "Add pers 1",
                    birthDate = LocalDate.now().minusYears(5),
                    gender = PersonGender.FEMALE,
                    income = BigDecimal("100"),
                    incomeDue = LocalDate.now(),
                    receivesFamilyAllowance = false,
                    country = Country(
                        id = 1,
                        code = "AT",
                        name = "Österreich",
                    ),
                    excludeFromHousehold = false,
                ),
                Person(
                    id = 3,
                    isMainPerson = false,
                    firstname = "Add pers 2",
                    lastname = "Add pers 2",
                    birthDate = LocalDate.now().minusYears(2),
                    gender = PersonGender.MALE,
                    receivesFamilyAllowance = true,
                    country = Country(
                        id = 1,
                        code = "AT",
                        name = "Österreich",
                    ),
                    excludeFromHousehold = true,
                ),
            ),
        )
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `validate household`() {
        every { householdService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val response = controller.validate(testHousehold)

        assertThat(response).isEqualTo(
            ValidateHouseholdResponse(
                valid = true,
                totalSum = BigDecimal("1"),
                limit = BigDecimal("2"),
                toleranceValue = BigDecimal("3"),
                amountExceededLimit = BigDecimal("4"),
            ),
        )

        verify {
            householdService.validate(testHousehold)
        }
    }

    @Test
    fun `create household - given id and exists already`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns true

        val exception = assertThrows<TafelValidationException> { controller.createHousehold(false, testHousehold) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 bereits vorhanden!")
    }

    @Test
    fun `create household - missing id so the household should be created`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns false

        val response = controller.createHousehold(false, testHousehold)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        verify { householdService.createHousehold(testHousehold, false, false) }
    }

    @Test
    fun `create household - supervisor with invalid income and force=true`() {
        val supervisorAuth = at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication(
            "TOKEN",
            testUserEntity.username,
            true,
            authorities = listOf(SimpleGrantedAuthority("SUPERVISOR")),
        )
        SecurityContextHolder.getContext().authentication = supervisorAuth

        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns false

        controller.createHousehold(true, testHousehold)

        verify { householdService.createHousehold(testHousehold, true, true) }
    }

    @Test
    fun `create household - force defaults to false when omitted`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns false

        controller.createHousehold(household = testHousehold)

        verify { householdService.createHousehold(testHousehold, false, false) }
    }

    @Test
    fun `update household - does not exist`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns false

        val exception =
            assertThrows<TafelValidationException> {
                controller.updateHousehold(testHousehold.id!!, false, testHousehold)
            }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `update household - exists and should be updated`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns true
        every {
            householdService.updateHousehold(
                testHousehold.id!!,
                testHousehold,
                false,
                isSupervisor,
            )
        } returns HouseholdUpdateResponse(data = testHousehold, errorMsg = null)

        val response = controller.updateHousehold(testHousehold.id!!, false, testHousehold)

        assertThat(response.data).isEqualTo(testHousehold)
        verify { householdService.updateHousehold(testHousehold.id!!, testHousehold, false, isSupervisor) }
    }

    @Test
    fun `update household with force=true`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns true
        every {
            householdService.updateHousehold(
                testHousehold.id!!,
                testHousehold,
                true,
                isSupervisor,
            )
        } returns HouseholdUpdateResponse(data = testHousehold, errorMsg = null)

        val response = controller.updateHousehold(testHousehold.id!!, true, testHousehold)

        assertThat(response.data).isEqualTo(testHousehold)
        verify { householdService.updateHousehold(testHousehold.id!!, testHousehold, true, isSupervisor) }
    }

    @Test
    fun `update household - force defaults to false when omitted`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns true
        every {
            householdService.updateHousehold(
                testHousehold.id!!,
                testHousehold,
                false,
                isSupervisor,
            )
        } returns HouseholdUpdateResponse(data = testHousehold, errorMsg = null)

        val response = controller.updateHousehold(householdId = testHousehold.id!!, household = testHousehold)

        assertThat(response.data).isEqualTo(testHousehold)
        verify { householdService.updateHousehold(testHousehold.id!!, testHousehold, false, isSupervisor) }
    }

    @Test
    fun `get household - doesnt exist`() {
        every { householdService.findByHouseholdId(testHousehold.id!!) } returns null

        val exception =
            assertThrows<TafelValidationException> { controller.getHousehold(testHousehold.id!!) }

        assertThat(exception.message).isEqualTo("Kunde Nr. ${testHousehold.id} nicht gefunden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        verify { householdService.findByHouseholdId(testHousehold.id!!) }
    }

    @Test
    fun `get household - exists`() {
        every { householdService.findByHouseholdId(testHousehold.id!!) } returns testHousehold

        val household = controller.getHousehold(testHousehold.id!!)

        verify { householdService.findByHouseholdId(testHousehold.id!!) }
        assertThat(household).isEqualTo(testHousehold)
    }

    @Test
    fun `delete household - doesnt exist`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns false

        val exception =
            assertThrows<TafelValidationException> { controller.deleteHousehold(testHousehold.id!!) }

        assertThat(exception.message).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        verify { householdService.existsByHouseholdId(testHousehold.id!!) }
    }

    @Test
    fun `delete household - exists`() {
        every { householdService.existsByHouseholdId(testHousehold.id!!) } returns true

        val response = controller.deleteHousehold(testHousehold.id!!)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify { householdService.existsByHouseholdId(testHousehold.id!!) }
    }

    @Test
    fun `get households - mapped correctly`() {
        val testSearchResult = HouseholdSearchResult(
            items = listOf(testHousehold),
            totalCount = 123,
            currentPage = 2,
            totalPages = 10,
            pageSize = 10,
        )
        every {
            householdService.getHouseholds(
                any(),
                any(),
                testSearchResult.currentPage,
                true,
                true,
                true,
            )
        } returns testSearchResult

        val response = controller.getHouseholds(
            firstname = " first ",
            lastname = " last ",
            page = testSearchResult.currentPage,
            postProcessing = true,
            costContribution = true,
            valid = true,
        )

        verify {
            householdService.getHouseholds(
                firstname = "first",
                lastname = "last",
                page = testSearchResult.currentPage,
                postProcessing = true,
                costContribution = true,
                valid = true,
            )
        }
        assertThat(response.items).hasSize(1)
    }

    @Test
    fun `get households - all filters default when omitted`() {
        val testSearchResult = HouseholdSearchResult(
            items = listOf(testHousehold),
            totalCount = 123,
            currentPage = 1,
            totalPages = 10,
            pageSize = 10,
        )
        every {
            householdService.getHouseholds(null, null, null, null, null, null)
        } returns testSearchResult

        val response = controller.getHouseholds()

        verify {
            householdService.getHouseholds(
                firstname = null,
                lastname = null,
                page = null,
                postProcessing = null,
                costContribution = null,
                valid = null,
            )
        }
        assertThat(response.items).hasSize(1)
    }

    @Test
    fun `generate pdf - no result`() {
        every { householdService.generatePdf(any(), any()) } returns null

        val exception = assertThrows<TafelValidationException> { controller.generatePdf(123, HouseholdPdfType.COMBINED) }

        assertThat(exception.status).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.message).isEqualTo("Kunde Nr. 123 nicht vorhanden!")
    }

    @Test
    fun `generate pdf - result mapped`() {
        val testFilename = "file.pdf"
        every { householdService.generatePdf(any(), any()) } returns HouseholdPdfResult(
            filename = testFilename,
            bytes = testFilename.toByteArray(),
        )

        val response = controller.generatePdf(123, HouseholdPdfType.COMBINED)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo(MediaType.APPLICATION_PDF_VALUE)

        assertThat(
            response.headers.get(HttpHeaders.CONTENT_DISPOSITION)!!.first(),
        ).isEqualTo("inline; filename=$testFilename")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(String(bodyBytes)).isEqualTo(testFilename)
    }

    @Test
    fun `get households above limit`() {
        val page = 2
        val aboveLimitItem = HouseholdAboveLimitItem(
            household = mockk(relaxed = true),
            totalSum = BigDecimal("1500"),
            limit = BigDecimal("1000"),
            amountExceededLimit = BigDecimal("500"),
        )
        val searchResult = HouseholdAboveLimitSearchResult(
            items = listOf(aboveLimitItem),
            totalCount = 26,
            currentPage = page,
            totalPages = 2,
            pageSize = 25,
        )
        every { householdService.getHouseholdsAboveLimit(page) } returns searchResult

        val response = controller.getHouseholdsAboveLimit(page)

        assertThat(response.items).isEqualTo(listOf(aboveLimitItem))
        assertThat(response.totalCount).isEqualTo(searchResult.totalCount)
        assertThat(response.currentPage).isEqualTo(searchResult.currentPage)
        assertThat(response.totalPages).isEqualTo(searchResult.totalPages)
        assertThat(response.pageSize).isEqualTo(searchResult.pageSize)
    }

    @Test
    fun `get duplicates - result mapped`() {
        val page = 4
        val duplicationItem = HouseholdDuplicateSearchResultItem(
            household = mockk(relaxed = true),
            similarHouseholds = mockk(relaxed = true),
        )

        val searchResult = HouseholdDuplicateSearchResult(
            items = listOf(duplicationItem),
            totalCount = 100,
            currentPage = page,
            totalPages = 20,
            pageSize = 5,
        )
        every { householdDuplicationService.findDuplicates(page) } returns searchResult

        val duplicatesResponse = controller.getDuplicates(page)

        assertThat(duplicatesResponse.items).hasSize(searchResult.items.size)
        assertThat(duplicatesResponse.items.first().household).isEqualTo(searchResult.items.first().household)
        assertThat(duplicatesResponse.items.first().similarHouseholds).isEqualTo(searchResult.items.first().similarHouseholds)

        assertThat(duplicatesResponse.currentPage).isEqualTo(searchResult.currentPage)
        assertThat(duplicatesResponse.pageSize).isEqualTo(searchResult.pageSize)
        assertThat(duplicatesResponse.totalPages).isEqualTo(searchResult.totalPages)
        assertThat(duplicatesResponse.totalCount).isEqualTo(searchResult.totalCount)
    }

    @Test
    fun `get duplicates - page defaults to null when omitted`() {
        val searchResult = HouseholdDuplicateSearchResult(
            items = emptyList(),
            totalCount = 0,
            currentPage = 1,
            totalPages = 0,
            pageSize = 5,
        )
        every { householdDuplicationService.findDuplicates(null) } returns searchResult

        val duplicatesResponse = controller.getDuplicates()

        assertThat(duplicatesResponse.items).isEmpty()
        verify { householdDuplicationService.findDuplicates(null) }
    }

    @Test
    fun `merge into household`() {
        val householdId = 100L
        val request = HouseholdMergeRequest(sourceHouseholdIds = listOf(200L, 300L))

        val response = controller.mergeIntoHousehold(householdId, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        verify { householdService.mergeHouseholds(householdId, request.sourceHouseholdIds) }
    }
}

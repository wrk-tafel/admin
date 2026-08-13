package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.internal.*
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorDetails
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

    @RelaxedMockK
    private lateinit var householdMergeService: HouseholdMergeService

    @InjectMockKs
    private lateinit var controller: HouseholdController

    private lateinit var testHouseholdRequest: HouseholdRequest
    private lateinit var testHouseholdResponse: HouseholdResponse
    private val isSupervisor = false

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.getContext().authentication =
            at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication(
                "TOKEN",
                testUserEntity.username,
                true,
            )

        val issuer = HouseholdIssuer(
            personnelNumber = "test-personnelnumber",
            firstname = "test-firstname",
            lastname = "test-lastname",
        )
        val address = HouseholdAddress(
            street = "Test-Straße",
            houseNumber = "100",
            stairway = "1",
            door = "21",
            postalCode = 1010,
            city = "Wien",
        )
        val persons = listOf(
            Person(
                id = 1,
                isMainPerson = true,
                firstname = "Max",
                lastname = "Mustermann",
                birthDate = LocalDate.now().minusYears(30),
                gender = PersonGender.FEMALE,
                country = CountryItem(
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
                country = CountryItem(
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
                country = CountryItem(
                    id = 1,
                    code = "AT",
                    name = "Österreich",
                ),
                excludeFromHousehold = true,
            ),
        )

        testHouseholdRequest = HouseholdRequest(
            id = 100,
            issuer = issuer,
            issuedAt = LocalDate.now(),
            telephoneNumber = "0043660123123",
            email = "test@mail.com",
            address = address,
            validUntil = LocalDate.now(),
            locked = false,
            persons = persons,
        )

        testHouseholdResponse = HouseholdResponse(
            id = 100,
            issuer = issuer,
            issuedAt = LocalDate.now(),
            telephoneNumber = "0043660123123",
            email = "test@mail.com",
            address = address,
            validUntil = LocalDate.now(),
            locked = false,
            persons = persons,
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
            details = IncomeValidatorDetails(
                incomeSum = BigDecimal("5"),
                familyAllowanceSum = BigDecimal("6"),
                childTaxAllowanceSum = BigDecimal("7"),
                siblingAdditionSum = BigDecimal("8"),
                baseLimit = BigDecimal("9"),
                baseLimitCountAdults = 2,
                baseLimitCountChildren = 1,
                additionalAdultsCount = 3,
                additionalAdultsSum = BigDecimal("10"),
                additionalChildrenCount = 4,
                additionalChildrenSum = BigDecimal("11"),
            ),
        )

        val response = controller.validate(testHouseholdRequest)

        assertThat(response).isEqualTo(
            ValidateHouseholdResponse(
                valid = true,
                totalSum = BigDecimal("1"),
                limit = BigDecimal("2"),
                toleranceValue = BigDecimal("3"),
                amountExceededLimit = BigDecimal("4"),
                details = IncomeCalculationDetails(
                    incomeSum = BigDecimal("5"),
                    familyAllowanceSum = BigDecimal("6"),
                    childTaxAllowanceSum = BigDecimal("7"),
                    siblingAdditionSum = BigDecimal("8"),
                    baseLimit = BigDecimal("9"),
                    baseLimitCountAdults = 2,
                    baseLimitCountChildren = 1,
                    additionalAdultsCount = 3,
                    additionalAdultsSum = BigDecimal("10"),
                    additionalChildrenCount = 4,
                    additionalChildrenSum = BigDecimal("11"),
                ),
            ),
        )

        verify {
            householdService.validate(testHouseholdRequest)
        }
    }

    @Test
    fun `create household - given id and exists already`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true

        val exception = assertThrows<ConflictException> { controller.createHousehold(false, testHouseholdRequest) }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. 100 bereits vorhanden!")
    }

    @Test
    fun `create household - missing id so the household should be created`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false

        val response = controller.createHousehold(false, testHouseholdRequest)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        verify { householdService.createHousehold(testHouseholdRequest, false, false) }
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

        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false

        controller.createHousehold(true, testHouseholdRequest)

        verify { householdService.createHousehold(testHouseholdRequest, true, true) }
    }

    @Test
    fun `create household - force defaults to false when omitted`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false

        controller.createHousehold(household = testHouseholdRequest)

        verify { householdService.createHousehold(testHouseholdRequest, false, false) }
    }

    @Test
    fun `update household - does not exist`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false

        val exception =
            assertThrows<NotFoundException> {
                controller.updateHousehold(testHouseholdRequest.id!!, false, testHouseholdRequest)
            }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `update household - exists and should be updated`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true
        every {
            householdService.updateHousehold(
                testHouseholdRequest.id!!,
                testHouseholdRequest,
                false,
                isSupervisor,
            )
        } returns HouseholdUpdateResponse(data = testHouseholdResponse, errorMsg = null)

        val response = controller.updateHousehold(testHouseholdRequest.id!!, false, testHouseholdRequest)

        assertThat(response.data).isEqualTo(testHouseholdResponse)
        verify { householdService.updateHousehold(testHouseholdRequest.id!!, testHouseholdRequest, false, isSupervisor) }
    }

    @Test
    fun `update household with force=true`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true
        every {
            householdService.updateHousehold(
                testHouseholdRequest.id!!,
                testHouseholdRequest,
                true,
                isSupervisor,
            )
        } returns HouseholdUpdateResponse(data = testHouseholdResponse, errorMsg = null)

        val response = controller.updateHousehold(testHouseholdRequest.id!!, true, testHouseholdRequest)

        assertThat(response.data).isEqualTo(testHouseholdResponse)
        verify { householdService.updateHousehold(testHouseholdRequest.id!!, testHouseholdRequest, true, isSupervisor) }
    }

    @Test
    fun `update household - force defaults to false when omitted`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true
        every {
            householdService.updateHousehold(
                testHouseholdRequest.id!!,
                testHouseholdRequest,
                false,
                isSupervisor,
            )
        } returns HouseholdUpdateResponse(data = testHouseholdResponse, errorMsg = null)

        val response =
            controller.updateHousehold(householdId = testHouseholdRequest.id!!, household = testHouseholdRequest)

        assertThat(response.data).isEqualTo(testHouseholdResponse)
        verify { householdService.updateHousehold(testHouseholdRequest.id!!, testHouseholdRequest, false, isSupervisor) }
    }

    @Test
    fun `get household - doesnt exist`() {
        every { householdService.findByHouseholdId(testHouseholdResponse.id!!) } returns null

        val exception =
            assertThrows<NotFoundException> { controller.getHousehold(testHouseholdResponse.id!!) }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. ${testHouseholdResponse.id} nicht gefunden!")
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        verify { householdService.findByHouseholdId(testHouseholdResponse.id!!) }
    }

    @Test
    fun `get household - exists`() {
        every { householdService.findByHouseholdId(testHouseholdResponse.id!!) } returns testHouseholdResponse

        val household = controller.getHousehold(testHouseholdResponse.id!!)

        verify { householdService.findByHouseholdId(testHouseholdResponse.id!!) }
        assertThat(household).isEqualTo(testHouseholdResponse)
    }

    @Test
    fun `delete household - doesnt exist`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false

        val exception =
            assertThrows<NotFoundException> { controller.deleteHousehold(testHouseholdRequest.id!!) }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        verify { householdService.existsByHouseholdId(testHouseholdRequest.id!!) }
    }

    @Test
    fun `delete household - exists`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true

        val response = controller.deleteHousehold(testHouseholdRequest.id!!)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify { householdService.existsByHouseholdId(testHouseholdRequest.id!!) }
    }

    @Test
    fun `get households - mapped correctly`() {
        val testSearchResult = HouseholdSearchResult(
            items = listOf(testHouseholdResponse),
            totalCount = 123,
            currentPage = 2,
            totalPages = 10,
            pageSize = 10,
        )
        every {
            householdService.getHouseholds(
                any(),
                testSearchResult.currentPage,
                true,
                true,
                true,
            )
        } returns testSearchResult

        val response = controller.getHouseholds(
            searchInput = " muster ",
            page = testSearchResult.currentPage,
            postProcessing = true,
            costContribution = true,
            valid = true,
        )

        verify {
            householdService.getHouseholds(
                searchInput = " muster ",
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
            items = listOf(testHouseholdResponse),
            totalCount = 123,
            currentPage = 1,
            totalPages = 10,
            pageSize = 10,
        )
        every {
            householdService.getHouseholds(null, null, null, null, null)
        } returns testSearchResult

        val response = controller.getHouseholds()

        verify {
            householdService.getHouseholds(
                searchInput = null,
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

        val exception = assertThrows<NotFoundException> { controller.generatePdf(123, HouseholdPdfType.MASTERDATA) }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Kunde Nr. 123 nicht vorhanden!")
    }

    @Test
    fun `generate pdf - result mapped`() {
        val testFilename = "file.pdf"
        every { householdService.generatePdf(any(), any()) } returns HouseholdPdfResult(
            filename = testFilename,
            bytes = testFilename.toByteArray(),
        )

        val response = controller.generatePdf(123, HouseholdPdfType.MASTERDATA)

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
        val sortBy = "totalSum"
        val sortDirection = "asc"
        val aboveLimitItem = HouseholdAboveLimitItem(
            household = mockk(relaxed = true),
            totalSum = BigDecimal("1500"),
            limit = BigDecimal("1000"),
            amountExceededLimit = BigDecimal("500"),
            percentageExceededLimit = BigDecimal("50.0"),
        )
        val searchResult = HouseholdAboveLimitSearchResult(
            items = listOf(aboveLimitItem),
            totalCount = 26,
            currentPage = page,
            totalPages = 2,
            pageSize = 25,
        )
        every { householdService.getHouseholdsAboveLimit(page, null, sortBy, sortDirection) } returns searchResult

        val response = controller.getHouseholdsAboveLimit(page, sortBy = sortBy, sortDirection = sortDirection)

        assertThat(response.items).isEqualTo(listOf(aboveLimitItem))
        assertThat(response.totalCount).isEqualTo(searchResult.totalCount)
        assertThat(response.currentPage).isEqualTo(searchResult.currentPage)
        assertThat(response.totalPages).isEqualTo(searchResult.totalPages)
        assertThat(response.pageSize).isEqualTo(searchResult.pageSize)
    }

    @Test
    fun `generate households above limit csv`() {
        val sortBy = "amountExceededLimit"
        val sortDirection = "desc"
        val csvResult = HouseholdAboveLimitCsvResult(
            filename = "kunden_ueber_limit_13.08.2026.csv",
            bytes = "Nr.;Name".toByteArray(),
        )
        every { householdService.generateAboveLimitCsv(sortBy, sortDirection) } returns csvResult

        val response = controller.generateHouseholdsAboveLimitCsv(sortBy, sortDirection)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo(MediaType.TEXT_PLAIN_VALUE)
        assertThat(
            response.headers.get(HttpHeaders.CONTENT_DISPOSITION)!!.first(),
        ).isEqualTo("inline; filename=${csvResult.filename}")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(bodyBytes).isEqualTo(csvResult.bytes)
    }

    @Test
    fun `get households overview`() {
        val distributionId = 100L
        val overviewResponse = HouseholdOverviewResponse(
            distributionId = distributionId,
            distributionStartedAt = null,
            distributionEndedAt = null,
            newHouseholds = listOf(HouseholdOverviewItem(household = mockk(relaxed = true), date = mockk(relaxed = true))),
            renewedHouseholds = emptyList(),
        )
        every { householdService.getHouseholdsOverview(distributionId) } returns overviewResponse

        val response = controller.getHouseholdsOverview(distributionId)

        assertThat(response).isEqualTo(overviewResponse)
        verify { householdService.getHouseholdsOverview(distributionId) }
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
        val expectedResponse = HouseholdMergeResponse(
            target = testHouseholdResponse,
            movedPersonCount = 1,
            droppedDuplicatePersonCount = 0,
            movedNoteCount = 0,
            movedDocumentCount = 0,
            movedDistributionCount = 0,
            droppedDistributionCount = 0,
            deletedHouseholdIds = listOf(200L, 300L),
        )
        every { householdMergeService.merge(householdId, request) } returns expectedResponse

        val response = controller.mergeIntoHousehold(householdId, request)

        assertThat(response).isEqualTo(expectedResponse)
        verify { householdMergeService.merge(householdId, request) }
    }

    @Test
    fun `get merge preview`() {
        val householdId = 100L
        val sourceHouseholdIds = listOf(200L, 300L)
        val expectedResponse = HouseholdMergePreviewResponse(
            target = testHouseholdResponse,
            sources = emptyList(),
            fieldConflicts = emptyList(),
            persons = emptyList(),
            distributionCollisions = emptyList(),
            noteCount = 0,
            documentCount = 0,
        )
        every { householdMergeService.preview(householdId, sourceHouseholdIds) } returns expectedResponse

        val response = controller.getMergePreview(householdId, sourceHouseholdIds)

        assertThat(response).isEqualTo(expectedResponse)
        verify { householdMergeService.preview(householdId, sourceHouseholdIds) }
    }

    @Test
    fun `pay cost contribution - doesnt exist`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false
        val request = HouseholdCostContributionPaymentRequest(amount = BigDecimal("4.00"))

        val exception =
            assertThrows<NotFoundException> { controller.payCostContribution(testHouseholdRequest.id!!, request) }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `pay cost contribution - exists`() {
        val request = HouseholdCostContributionPaymentRequest(amount = BigDecimal("4.00"))
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true
        every {
            householdService.payCostContribution(testHouseholdRequest.id!!, request.amount)
        } returns testHouseholdResponse

        val response = controller.payCostContribution(testHouseholdRequest.id!!, request)

        assertThat(response).isEqualTo(testHouseholdResponse)
        verify { householdService.payCostContribution(testHouseholdRequest.id!!, request.amount) }
    }

    @Test
    fun `edit cost contribution - doesnt exist`() {
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns false
        val request = HouseholdCostContributionEditRequest(amount = BigDecimal("4.00"))

        val exception =
            assertThrows<NotFoundException> { controller.editCostContribution(testHouseholdRequest.id!!, request) }

        assertThat(exception.body.detail).isEqualTo("Kunde Nr. 100 nicht vorhanden!")
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    @Test
    fun `edit cost contribution - exists`() {
        val request = HouseholdCostContributionEditRequest(amount = BigDecimal("4.00"))
        every { householdService.existsByHouseholdId(testHouseholdRequest.id!!) } returns true
        every {
            householdService.editCostContribution(testHouseholdRequest.id!!, request.amount!!)
        } returns testHouseholdResponse

        val response = controller.editCostContribution(testHouseholdRequest.id!!, request)

        assertThat(response).isEqualTo(testHouseholdResponse)
        verify { householdService.editCostContribution(testHouseholdRequest.id!!, request.amount!!) }
    }
}

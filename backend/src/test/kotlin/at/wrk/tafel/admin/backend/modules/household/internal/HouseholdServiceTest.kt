package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.household.Household
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdCreationResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdPdfType
import at.wrk.tafel.admin.backend.modules.household.HouseholdUpdateResponse
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
import at.wrk.tafel.admin.backend.modules.base.country.Country
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

@ExtendWith(MockKExtension::class)
class HouseholdServiceTest {

    @RelaxedMockK
    private lateinit var incomeValidatorService: IncomeValidatorService

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var householdPdfService: HouseholdPdfService

    @RelaxedMockK
    private lateinit var householdConverter: HouseholdConverter

    @InjectMockKs
    private lateinit var service: HouseholdService

    private val testCountry = Country(id = testCountry1.id!!, code = testCountry1.code!!, name = testCountry1.name!!)

    @BeforeEach
    fun beforeEach() {
        every { userRepository.findByUsername(any()) } returns testUserEntity
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)

        every { countryRepository.findById(testCountry1.id!!) } returns Optional.of(testCountry1)
        every { userRepository.findByUsername(testUserEntity.username!!) } returns testUserEntity
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `validate household`() {
        val testHousehold = Household(
            id = 100,
            address = HouseholdAddress(
                street = "street",
                houseNumber = "1",
                postalCode = 1010,
                city = "Wien"
            ),
            persons = listOf(
                Person(
                    id = 1,
                    isMainPerson = true,
                    firstname = "Max",
                    lastname = "Mustermann",
                    birthDate = LocalDate.now().minusYears(30),
                    gender = null,
                    country = testCountry,
                    income = BigDecimal("1000")
                ),
                Person(
                    id = 2,
                    isMainPerson = false,
                    firstname = "Child",
                    lastname = "Mustermann",
                    birthDate = LocalDate.now().minusYears(5),
                    gender = null,
                    country = testCountry,
                    income = BigDecimal("100"),
                    excludeFromHousehold = false,
                    receivesFamilyBonus = false
                ),
                Person(
                    id = 3,
                    isMainPerson = false,
                    firstname = "Child 2",
                    lastname = "Mustermann",
                    birthDate = LocalDate.now().minusYears(2),
                    gender = null,
                    country = testCountry,
                    income = null,
                    excludeFromHousehold = true,
                    receivesFamilyBonus = true
                )
            )
        )

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.validate(testHousehold)

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

        assertThat(incomeValidatorPersons.first()).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(5),
                monthlyIncome = BigDecimal("100"),
                excludeFromIncomeCalculation = false,
                receivesFamilyBonus = false
            )
        )

        assertThat(incomeValidatorPersons[1]).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(2),
                excludeFromIncomeCalculation = true,
                receivesFamilyBonus = true
            )
        )

        assertThat(incomeValidatorPersons[2]).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(30),
                monthlyIncome = BigDecimal("1000"),
                excludeFromIncomeCalculation = false
            )
        )
    }

    @Test
    fun existsByHouseholdId() {
        every { householdRepository.existsByHouseholdId(any()) } returns true

        val result = service.existsByHouseholdId(1)

        assertThat(result).isTrue
        verify { householdRepository.existsByHouseholdId(1) }
    }

    @Test
    fun `findByHouseholdId - not found`() {
        every { householdRepository.findByHouseholdId(any()) } returns null

        val household = service.findByHouseholdId(1)

        assertThat(household).isNull()
    }

    @Test
    fun `findByHouseholdId - found`() {
        val testHouseholdEntity = mockk<HouseholdEntity>(relaxed = true)
        every { householdRepository.findByHouseholdId(any()) } returns testHouseholdEntity

        val testHousehold = mockk<Household>(relaxed = true)
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHousehold

        val household = service.findByHouseholdId(1)

        assertThat(household).isEqualTo(testHousehold)
    }

    @Test
    fun `create household writes the household first and points it at its main person afterwards`() {
        val testHousehold = mockk<Household>(relaxed = true)
        val mainPerson = PersonEntity().apply { isMainPerson = true }
        val testHouseholdEntity = HouseholdEntity().apply { persons = mutableListOf(mainPerson) }

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHousehold
        every { householdConverter.mapHouseholdToEntity(testHousehold) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.createHousehold(testHousehold, force = false, isSupervisor = false)

        assertThat(result).isEqualTo(HouseholdCreationResponse(data = testHousehold, errorMsg = null))
        assertThat(testHouseholdEntity.mainPerson).isEqualTo(mainPerson)

        verify(exactly = 2) { householdRepository.saveAndFlush(any()) }
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(testHousehold) }
    }

    @Test
    fun `create household - supervisor with invalid income and force=true should save`() {
        val testHousehold = mockk<Household>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity()

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHousehold
        every { householdConverter.mapHouseholdToEntity(testHousehold) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.createHousehold(testHousehold, true, true)

        assertThat(result).isEqualTo(HouseholdCreationResponse(data = testHousehold, errorMsg = null))
        verify(exactly = 2) { householdRepository.saveAndFlush(testHouseholdEntity) }
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(testHousehold) }
    }

    @Test
    fun `create household - supervisor with invalid income and force=false should throw exception`() {
        val testHousehold = mockk<Household>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity()

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHousehold
        every { householdConverter.mapHouseholdToEntity(testHousehold) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val exception = assertThrows<TafelValidationException> {
            service.createHousehold(testHousehold, false, true)
        }

        assertThat(exception.message).isEqualTo("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
        assertThat(exception.status).isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
        verify(exactly = 0) { householdRepository.saveAndFlush(any()) }
    }

    @Test
    fun `create household - non-supervisor with invalid income should set validUntil to yesterday`() {
        val testHousehold = mockk<Household>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity()

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHousehold
        every { householdConverter.mapHouseholdToEntity(testHousehold) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.createHousehold(testHousehold, force = false, isSupervisor = false)

        assertThat(result).isEqualTo(
            HouseholdCreationResponse(
                data = testHousehold,
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet"
            )
        )
        assertThat(testHouseholdEntity.validUntil).isEqualTo(LocalDate.now().minusDays(1))
        verify(exactly = 2) { householdRepository.saveAndFlush(testHouseholdEntity) }
    }

    @Test
    fun `update household is valid`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<Household>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId

        val existingMainPerson = PersonEntity().apply {
            id = 555
            isMainPerson = true
        }
        val testHouseholdEntity = HouseholdEntity().apply { persons = mutableListOf(existingMainPerson) }
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdUpdate
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val force = false
        val result = service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force, false)

        assertThat(result).isEqualTo(HouseholdUpdateResponse(data = testHouseholdUpdate, errorMsg = null))
        // the main person row already exists, so no second write is necessary
        verify(exactly = 1) { householdRepository.saveAndFlush(testHouseholdEntity) }
        assertThat(testHouseholdEntity.mainPerson).isEqualTo(existingMainPerson)
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(testHouseholdUpdate, testHouseholdEntity) }
    }

    @Test
    fun `update household is invalid and should set validUntil to yesterday when not supervisor`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<Household>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId

        val testHouseholdEntity = HouseholdEntity()
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdUpdate
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result =
            service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force = false, isSupervisor = false)

        assertThat(result).isEqualTo(
            HouseholdUpdateResponse(
                data = testHouseholdUpdate,
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet"
            )
        )
        assertThat(testHouseholdEntity.validUntil).isEqualTo(LocalDate.now().minusDays(1))
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(any(), any()) }
    }

    @Test
    fun `update household - supervisor with invalid income and force=false should throw exception`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<Household>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId

        val testHouseholdEntity = HouseholdEntity()
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val exception = assertThrows<TafelValidationException> {
            service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force = false, isSupervisor = true)
        }

        assertThat(exception.message).isEqualTo("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
        assertThat(exception.status).isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
        verify(exactly = 0) { householdRepository.saveAndFlush(any()) }
    }

    @Test
    fun `update household with force=true when supervisor tries to bypass validation`() {
        val householdId = 123L

        val testHousehold = mockk<Household>(relaxed = true)
        every { testHousehold.id } returns householdId

        val testHouseholdUpdate = mockk<Household>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId

        val testHouseholdEntity = HouseholdEntity()
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdUpdate
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result = service.updateHousehold(testHousehold.id!!, testHouseholdUpdate, true, true)

        assertThat(result).isEqualTo(HouseholdUpdateResponse(data = testHouseholdUpdate, errorMsg = null))
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(any(), any()) }
    }

    @Test
    fun `get households`() {
        val testHouseholdEntity1 = mockk<HouseholdEntity>(relaxed = true)
        val testHouseholdEntity2 = mockk<HouseholdEntity>(relaxed = true)

        val testHousehold = mockk<Household>(relaxed = true)
        every { householdConverter.mapEntityToHousehold(any()) } returns testHousehold

        val selectedPage = 3
        val pageRequest = PageRequest.of(selectedPage - 1, 25)
        val page = PageImpl(listOf(testHouseholdEntity1, testHouseholdEntity2), pageRequest, 123)
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), pageRequest) } returns page

        val searchResult =
            service.getHouseholds(page = selectedPage, postProcessing = true, costContribution = true, valid = true)

        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(5)
        assertThat(searchResult.totalCount).isEqualTo(page.totalElements)
        assertThat(searchResult.pageSize).isEqualTo(pageRequest.pageSize)

        val households = searchResult.items
        assertThat(households).hasSize(2)
        assertThat(households[0]).isEqualTo(testHousehold)

        verify(exactly = 1) { householdRepository.findAll(any<Specification<HouseholdEntity>>(), pageRequest) }
    }

    @Test
    fun `get households above limit - only invalid households are returned`() {
        val testHouseholdEntity1 = mockk<HouseholdEntity>(relaxed = true)
        val testHouseholdEntity2 = mockk<HouseholdEntity>(relaxed = true)

        val validHousehold = mockk<Household>(relaxed = true)
        val invalidHousehold = mockk<Household>(relaxed = true)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns listOf(
            testHouseholdEntity1,
            testHouseholdEntity2
        )
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity1) } returns validHousehold
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity2) } returns invalidHousehold

        every { incomeValidatorService.validate(any()) } returnsMany listOf(
            IncomeValidatorResult(
                valid = true,
                totalSum = BigDecimal("500"),
                limit = BigDecimal("1000"),
                toleranceValue = BigDecimal.ZERO,
                amountExceededLimit = BigDecimal.ZERO
            ),
            IncomeValidatorResult(
                valid = false,
                totalSum = BigDecimal("1500"),
                limit = BigDecimal("1000"),
                toleranceValue = BigDecimal.ZERO,
                amountExceededLimit = BigDecimal("500")
            )
        )

        val result = service.getHouseholdsAboveLimit()

        assertThat(result).hasSize(1)
        assertThat(result.first().household).isEqualTo(invalidHousehold)
        assertThat(result.first().totalSum).isEqualTo(BigDecimal("1500"))
        assertThat(result.first().limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.first().amountExceededLimit).isEqualTo(BigDecimal("500"))
    }

    @Test
    fun `generate pdf household - not found`() {
        every { householdRepository.findByHouseholdId(any()) } returns null

        val result = service.generatePdf(1, HouseholdPdfType.MASTERDATA)

        assertThat(result).isNull()
    }

    @Test
    fun `generate pdf household - found`() {
        val testHouseholdEntity = testHouseholdEntityWithMainPerson()

        val pdfBytes = ByteArray(10)
        every { householdRepository.findByHouseholdId(any()) } returns testHouseholdEntity
        every { householdPdfService.generateMasterdataPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, HouseholdPdfType.MASTERDATA)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("stammdaten-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
    }

    @Test
    fun `generate pdf household - IDCARD type`() {
        val testHouseholdEntity = testHouseholdEntityWithMainPerson()

        val pdfBytes = ByteArray(10)
        every { householdRepository.findByHouseholdId(any()) } returns testHouseholdEntity
        every { householdPdfService.generateIdCardPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, HouseholdPdfType.IDCARD)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("ausweis-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
        verify(exactly = 1) { householdPdfService.generateIdCardPdf(testHouseholdEntity) }
    }

    @Test
    fun `generate pdf household - COMBINED type`() {
        val testHouseholdEntity = testHouseholdEntityWithMainPerson()

        val pdfBytes = ByteArray(10)
        every { householdRepository.findByHouseholdId(any()) } returns testHouseholdEntity
        every { householdPdfService.generateCombinedPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, HouseholdPdfType.COMBINED)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("stammdaten-ausweis-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
        verify(exactly = 1) { householdPdfService.generateCombinedPdf(testHouseholdEntity) }
    }

    @Test
    fun `delete household by householdId releases the main person pointer first`() {
        val householdId = 123L
        val testHouseholdEntity = testHouseholdEntityWithMainPerson()
        every { householdRepository.findByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity

        service.deleteHouseholdByHouseholdId(householdId)

        assertThat(testHouseholdEntity.mainPerson).isNull()
        verify(exactly = 1) { householdRepository.saveAndFlush(testHouseholdEntity) }
        verify(exactly = 1) { householdRepository.delete(testHouseholdEntity) }
    }

    @Test
    fun `delete household by householdId - unknown household is ignored`() {
        every { householdRepository.findByHouseholdId(any()) } returns null

        service.deleteHouseholdByHouseholdId(999L)

        verify(exactly = 0) { householdRepository.delete(any<HouseholdEntity>()) }
    }

    @Test
    fun `update household with force=true when non-supervisor should still set validUntil to yesterday`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<Household>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId

        val testHouseholdEntity = HouseholdEntity().apply {
            validUntil = LocalDate.now()
        }
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdUpdate
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4")
        )

        val result =
            service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force = true, isSupervisor = false)

        assertThat(result).isEqualTo(
            HouseholdUpdateResponse(
                data = testHouseholdUpdate,
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet"
            )
        )
        assertThat(testHouseholdEntity.validUntil).isEqualTo(LocalDate.now().minusDays(1))
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(any(), any()) }
    }

    @Test
    fun `merge households`() {
        val targetHousehold = 1L
        val sourceHouseholds = listOf(2L, 3L, 4L)

        val entity2 = testHouseholdEntityWithMainPerson().apply { id = 2 }
        val entity3 = testHouseholdEntityWithMainPerson().apply { id = 3 }
        val entity4 = testHouseholdEntityWithMainPerson().apply { id = 4 }
        every { householdRepository.findByHouseholdId(2L) } returns entity2
        every { householdRepository.findByHouseholdId(3L) } returns entity3
        every { householdRepository.findByHouseholdId(4L) } returns entity4
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns entity2

        service.mergeHouseholds(targetHousehold, sourceHouseholds)

        verify(exactly = 1) { householdRepository.delete(entity2) }
        verify(exactly = 1) { householdRepository.delete(entity3) }
        verify(exactly = 1) { householdRepository.delete(entity4) }
        verify(exactly = 0) { householdRepository.findByHouseholdId(1L) }
    }

    private fun testHouseholdEntityWithMainPerson(): HouseholdEntity {
        val household = HouseholdEntity().apply { householdId = 100 }
        val mainPerson = PersonEntity().apply {
            id = 1
            this.household = household
            isMainPerson = true
            firstname = "max"
            lastname = "mustermann"
        }
        household.persons = mutableListOf(mainPerson)
        household.mainPerson = mainPerson
        return household
    }

}

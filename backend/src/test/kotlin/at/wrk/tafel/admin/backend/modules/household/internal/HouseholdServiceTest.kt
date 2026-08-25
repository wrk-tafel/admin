package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdCreationResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdPdfType
import at.wrk.tafel.admin.backend.modules.household.HouseholdRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdUpdateResponse
import at.wrk.tafel.admin.backend.modules.household.IncomeQuickCheckPersonItem
import at.wrk.tafel.admin.backend.modules.household.IncomeQuickCheckRequest
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageService
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
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
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
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

    @RelaxedMockK
    private lateinit var documentStorageService: DocumentStorageService

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var householdDuplicationService: HouseholdDuplicationService

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    @InjectMockKs
    private lateinit var service: HouseholdService

    private val testCountry = CountryItem(id = testCountry1.id!!, code = testCountry1.code!!, name = testCountry1.name!!)

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
        val testHousehold = HouseholdRequest(
            id = 100,
            address = HouseholdAddress(
                street = "street",
                houseNumber = "1",
                postalCode = 1010,
                city = "Wien",
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
                    income = BigDecimal("1000"),
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
                    receivesFamilyAllowance = false,
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
                    receivesFamilyAllowance = true,
                ),
            ),
        )

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.validate(testHousehold)

        assertThat(result).isEqualTo(
            IncomeValidatorResult(
                valid = true,
                totalSum = BigDecimal("1"),
                limit = BigDecimal("2"),
                toleranceValue = BigDecimal("3"),
                amountExceededLimit = BigDecimal("4"),
            ),
        )

        val incomeValidatorPersonsSlot = slot<List<IncomeValidatorPerson>>()
        verify { incomeValidatorService.validate(capture(incomeValidatorPersonsSlot)) }

        val incomeValidatorPersons = incomeValidatorPersonsSlot.captured

        assertThat(incomeValidatorPersons.first()).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(5),
                monthlyIncome = BigDecimal("100"),
                excludeFromIncomeCalculation = false,
                receivesFamilyAllowance = false,
            ),
        )

        assertThat(incomeValidatorPersons[1]).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(2),
                excludeFromIncomeCalculation = true,
                receivesFamilyAllowance = true,
            ),
        )

        assertThat(incomeValidatorPersons[2]).isEqualTo(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(30),
                monthlyIncome = BigDecimal("1000"),
                excludeFromIncomeCalculation = false,
            ),
        )
    }

    @Test
    fun `quickcheck maps the minimal person data to validation persons`() {
        val request = IncomeQuickCheckRequest(
            persons = listOf(
                IncomeQuickCheckPersonItem(
                    birthDate = LocalDate.now().minusYears(30),
                    income = BigDecimal("1000"),
                ),
                IncomeQuickCheckPersonItem(
                    birthDate = LocalDate.now().minusYears(5),
                    income = null,
                    receivesFamilyAllowance = true,
                ),
            ),
        )

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.quickCheck(request)

        assertThat(result).isEqualTo(
            IncomeValidatorResult(
                valid = true,
                totalSum = BigDecimal("1"),
                limit = BigDecimal("2"),
                toleranceValue = BigDecimal("3"),
                amountExceededLimit = BigDecimal("4"),
            ),
        )

        val incomeValidatorPersonsSlot = slot<List<IncomeValidatorPerson>>()
        verify { incomeValidatorService.validate(capture(incomeValidatorPersonsSlot)) }

        assertThat(incomeValidatorPersonsSlot.captured).containsExactly(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(30),
                monthlyIncome = BigDecimal("1000"),
                excludeFromIncomeCalculation = false,
                receivesFamilyAllowance = false,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(5),
                monthlyIncome = null,
                excludeFromIncomeCalculation = false,
                receivesFamilyAllowance = true,
            ),
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

        val testHousehold = mockk<HouseholdResponse>(relaxed = true)
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHousehold

        val household = service.findByHouseholdId(1)

        assertThat(household).isEqualTo(testHousehold)
    }

    @Test
    fun `create household writes the household first and points it at its main person afterwards`() {
        val testHouseholdRequest = mockk<HouseholdRequest>(relaxed = true)
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity(householdId = 1, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = testHouseholdEntity, country = testCountry1, isMainPerson = true)
        testHouseholdEntity.persons = mutableListOf(mainPerson)

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdConverter.mapHouseholdToEntity(testHouseholdRequest) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.createHousehold(testHouseholdRequest, force = false, isSupervisor = false)

        assertThat(result).isEqualTo(HouseholdCreationResponse(data = testHouseholdResponse, errorMsg = null))
        assertThat(testHouseholdEntity.mainPerson).isEqualTo(mainPerson)

        verify(exactly = 2) { householdRepository.saveAndFlush(any()) }
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(testHouseholdRequest) }
    }

    @Test
    fun `create household - supervisor with invalid income and force=true should save`() {
        val testHouseholdRequest = mockk<HouseholdRequest>(relaxed = true)
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity(householdId = 1, validUntil = LocalDate.now())

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdConverter.mapHouseholdToEntity(testHouseholdRequest) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.createHousehold(testHouseholdRequest, true, true)

        assertThat(result).isEqualTo(HouseholdCreationResponse(data = testHouseholdResponse, errorMsg = null))
        verify(exactly = 2) { householdRepository.saveAndFlush(testHouseholdEntity) }
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(testHouseholdRequest) }
    }

    @Test
    fun `create household - supervisor with invalid income and force=false should throw exception`() {
        val testHouseholdRequest = mockk<HouseholdRequest>(relaxed = true)
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity(householdId = 1, validUntil = LocalDate.now())

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdConverter.mapHouseholdToEntity(testHouseholdRequest) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val exception = assertThrows<ConflictException> {
            service.createHousehold(testHouseholdRequest, false, true)
        }

        assertThat(exception.body.detail).isEqualTo("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
        assertThat(exception.statusCode).isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
        verify(exactly = 0) { householdRepository.saveAndFlush(any()) }
    }

    @Test
    fun `create household - non-supervisor with invalid income should set validUntil to yesterday`() {
        val testHouseholdRequest = mockk<HouseholdRequest>(relaxed = true)
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity(householdId = 1, validUntil = LocalDate.now())

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdConverter.mapHouseholdToEntity(testHouseholdRequest) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.createHousehold(testHouseholdRequest, force = false, isSupervisor = false)

        assertThat(result).isEqualTo(
            HouseholdCreationResponse(
                data = testHouseholdResponse,
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            ),
        )
        assertThat(testHouseholdEntity.validUntil).isEqualTo(LocalDate.now().minusDays(1))
        verify(exactly = 2) { householdRepository.saveAndFlush(testHouseholdEntity) }
    }

    @Test
    fun `create household - duplicate found and force=false should throw exception`() {
        val birthDate = LocalDate.now().minusYears(30)
        val testHouseholdRequest = HouseholdRequest(
            address = HouseholdAddress(street = "street", houseNumber = "1", postalCode = 1010, city = "Wien"),
            persons = listOf(
                Person(
                    isMainPerson = true,
                    firstname = "Max",
                    lastname = "Mustermann",
                    birthDate = birthDate,
                    gender = null,
                    country = testCountry,
                ),
            ),
        )

        every {
            householdDuplicationService.findPotentialDuplicates(
                mainPersonFirstname = "Max",
                mainPersonLastname = "Mustermann",
                addressStreet = "street",
                addressHouseNumber = "1",
                addressDoor = null,
                persons = listOf(PersonNameAndBirthDate(firstname = "Max", lastname = "Mustermann", birthDate = birthDate)),
                excludeHouseholdId = null,
            )
        } returns listOf(HouseholdDuplicateCandidate(householdId = 555, personName = "Max Mustermann"))

        val exception = assertThrows<ConflictException> {
            service.createHousehold(testHouseholdRequest, force = false, isSupervisor = false)
        }

        assertThat(exception.body.detail).isEqualTo("Möglicherweise bereits vorhanden: Kunde Nr. 555 (Max Mustermann)")
        assertThat(exception.statusCode).isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
        verify(exactly = 0) { householdRepository.saveAndFlush(any()) }
    }

    @Test
    fun `create household - duplicate found and force=true should save without checking`() {
        val testHouseholdRequest = mockk<HouseholdRequest>(relaxed = true)
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        val testHouseholdEntity = HouseholdEntity(householdId = 1, validUntil = LocalDate.now())

        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdConverter.mapHouseholdToEntity(testHouseholdRequest) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.createHousehold(testHouseholdRequest, force = true, isSupervisor = false)

        assertThat(result).isEqualTo(HouseholdCreationResponse(data = testHouseholdResponse, errorMsg = null))
        verify(exactly = 0) { householdDuplicationService.findPotentialDuplicates(any(), any(), any(), any(), any(), any(), any()) }
    }

    @Test
    fun `update household is valid`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<HouseholdRequest>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)

        val testHouseholdEntity = HouseholdEntity(householdId = 1, validUntil = LocalDate.now())
        val existingMainPerson = PersonEntity(household = testHouseholdEntity, country = testCountry1, isMainPerson = true).apply {
            id = 555
        }
        testHouseholdEntity.persons = mutableListOf(existingMainPerson)
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = true,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val force = false
        val result = service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force, false)

        assertThat(result).isEqualTo(HouseholdUpdateResponse(data = testHouseholdResponse, errorMsg = null))
        // the main person row already exists, so no second write is necessary
        verify(exactly = 1) { householdRepository.saveAndFlush(testHouseholdEntity) }
        assertThat(testHouseholdEntity.mainPerson).isEqualTo(existingMainPerson)
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(testHouseholdUpdate, testHouseholdEntity) }
    }

    @Test
    fun `update household - duplicate found and force=false should throw exception excluding itself`() {
        val householdId = 123L
        val birthDate = LocalDate.now().minusYears(30)
        val testHouseholdUpdate = HouseholdRequest(
            id = householdId,
            address = HouseholdAddress(street = "street", houseNumber = "1", postalCode = 1010, city = "Wien"),
            persons = listOf(
                Person(
                    isMainPerson = true,
                    firstname = "Max",
                    lastname = "Mustermann",
                    birthDate = birthDate,
                    gender = null,
                    country = testCountry,
                ),
            ),
        )

        every {
            householdDuplicationService.findPotentialDuplicates(
                mainPersonFirstname = "Max",
                mainPersonLastname = "Mustermann",
                addressStreet = "street",
                addressHouseNumber = "1",
                addressDoor = null,
                persons = listOf(PersonNameAndBirthDate(firstname = "Max", lastname = "Mustermann", birthDate = birthDate)),
                excludeHouseholdId = householdId,
            )
        } returns listOf(HouseholdDuplicateCandidate(householdId = 555, personName = "Max Mustermann"))

        val exception = assertThrows<ConflictException> {
            service.updateHousehold(householdId, testHouseholdUpdate, force = false, isSupervisor = false)
        }

        assertThat(exception.body.detail).isEqualTo("Möglicherweise bereits vorhanden: Kunde Nr. 555 (Max Mustermann)")
        assertThat(exception.statusCode).isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
        verify(exactly = 0) { householdRepository.saveAndFlush(any()) }
    }

    @Test
    fun `update household is invalid and should set validUntil to yesterday when not supervisor`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<HouseholdRequest>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)

        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now())
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result =
            service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force = false, isSupervisor = false)

        assertThat(result).isEqualTo(
            HouseholdUpdateResponse(
                data = testHouseholdResponse,
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            ),
        )
        assertThat(testHouseholdEntity.validUntil).isEqualTo(LocalDate.now().minusDays(1))
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(any(), any()) }
    }

    @Test
    fun `update household - supervisor with invalid income and force=false should throw exception`() {
        val householdId = 123L

        val testHouseholdUpdate = mockk<HouseholdRequest>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId

        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now())
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val exception = assertThrows<ConflictException> {
            service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force = false, isSupervisor = true)
        }

        assertThat(exception.body.detail).isEqualTo("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
        assertThat(exception.statusCode).isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
        verify(exactly = 0) { householdRepository.saveAndFlush(any()) }
    }

    @Test
    fun `update household with force=true when supervisor tries to bypass validation`() {
        val householdId = 123L

        val testHousehold = mockk<HouseholdRequest>(relaxed = true)
        every { testHousehold.id } returns householdId

        val testHouseholdUpdate = mockk<HouseholdRequest>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)

        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now())
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result = service.updateHousehold(testHousehold.id!!, testHouseholdUpdate, true, true)

        assertThat(result).isEqualTo(HouseholdUpdateResponse(data = testHouseholdResponse, errorMsg = null))
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(any(), any()) }
    }

    @Test
    fun `get households`() {
        val testHouseholdEntity1 = mockk<HouseholdEntity>(relaxed = true)
        val testHouseholdEntity2 = mockk<HouseholdEntity>(relaxed = true)

        val testHousehold = mockk<HouseholdResponse>(relaxed = true)
        every { householdConverter.mapEntityToHousehold(any()) } returns testHousehold

        val selectedPage = 3
        val pageRequest = PageRequest.of(selectedPage - 1, PaginationDefaults.DEFAULT_PAGE_SIZE)
        val page = PageImpl(listOf(testHouseholdEntity1, testHouseholdEntity2), pageRequest, 123)
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), pageRequest) } returns page

        val searchResult =
            service.getHouseholds(
                page = selectedPage,
                postProcessing = true,
                costContribution = true,
                valid = true,
                locked = true,
                missingPrivacyNotice = true,
            )

        assertThat(searchResult.currentPage).isEqualTo(selectedPage)
        assertThat(searchResult.totalPages).isEqualTo(page.totalPages)
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

        val validHousehold = mockk<HouseholdResponse>(relaxed = true)
        val invalidHousehold = mockk<HouseholdResponse>(relaxed = true)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns listOf(
            testHouseholdEntity1,
            testHouseholdEntity2,
        )
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity1) } returns validHousehold
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity2) } returns invalidHousehold

        every { incomeValidatorService.validateAll(any()) } returns listOf(
            Result.success(
                IncomeValidatorResult(
                    valid = true,
                    totalSum = BigDecimal("500"),
                    limit = BigDecimal("1000"),
                    toleranceValue = BigDecimal.ZERO,
                    amountExceededLimit = BigDecimal.ZERO,
                ),
            ),
            Result.success(
                IncomeValidatorResult(
                    valid = false,
                    totalSum = BigDecimal("1500"),
                    limit = BigDecimal("1000"),
                    toleranceValue = BigDecimal.ZERO,
                    amountExceededLimit = BigDecimal("500"),
                ),
            ),
        )

        val result = service.getHouseholdsAboveLimit()

        assertThat(result.items).hasSize(1)
        assertThat(result.items.first().household).isEqualTo(invalidHousehold)
        assertThat(result.items.first().totalSum).isEqualTo(BigDecimal("1500"))
        assertThat(result.items.first().limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.items.first().amountExceededLimit).isEqualTo(BigDecimal("500"))
        assertThat(result.items.first().percentageExceededLimit).isEqualByComparingTo(BigDecimal("50.0"))
        assertThat(result.totalCount).isEqualTo(1)
        assertThat(result.currentPage).isEqualTo(1)
        assertThat(result.totalPages).isEqualTo(1)
        assertThat(result.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)

        // the household that turned out to be below the limit is never mapped to a response
        verify(exactly = 0) { householdConverter.mapEntityToHousehold(testHouseholdEntity1) }
        verify(exactly = 1) { householdConverter.mapEntityToHousehold(testHouseholdEntity2) }
    }

    @Test
    fun `get households above limit - a limit of zero yields a zero percentage instead of dividing by it`() {
        val entity = mockk<HouseholdEntity>(relaxed = true)
        val household = mockk<HouseholdResponse>(relaxed = true)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns listOf(entity)
        every { householdConverter.mapEntityToHousehold(entity) } returns household

        every { incomeValidatorService.validateAll(any()) } returns listOf(
            Result.success(
                IncomeValidatorResult(
                    valid = false,
                    totalSum = BigDecimal("500"),
                    limit = BigDecimal.ZERO,
                    toleranceValue = BigDecimal.ZERO,
                    amountExceededLimit = BigDecimal("500"),
                ),
            ),
        )

        val result = service.getHouseholdsAboveLimit()

        assertThat(result.items.first().percentageExceededLimit).isEqualByComparingTo(BigDecimal.ZERO)
    }

    @Test
    fun `get households above limit - defaults to sorting by exceedance, largest first`() {
        val entities = (1..3).map { mockk<HouseholdEntity>(relaxed = true) }
        val households = (1..3).map { mockk<HouseholdResponse>(relaxed = true) }

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns entities
        entities.forEachIndexed { index, entity -> every { householdConverter.mapEntityToHousehold(entity) } returns households[index] }

        val amounts = listOf(BigDecimal("100"), BigDecimal("500"), BigDecimal("250"))
        every { incomeValidatorService.validateAll(any()) } answers {
            firstArg<List<List<IncomeValidatorPerson>>>().mapIndexed { index, _ ->
                Result.success(
                    IncomeValidatorResult(
                        valid = false,
                        totalSum = BigDecimal("1500"),
                        limit = BigDecimal("1000"),
                        toleranceValue = BigDecimal.ZERO,
                        amountExceededLimit = amounts[index],
                    ),
                )
            }
        }

        val result = service.getHouseholdsAboveLimit()

        assertThat(result.items.map { it.amountExceededLimit }).containsExactly(
            BigDecimal("500"),
            BigDecimal("250"),
            BigDecimal("100"),
        )
    }

    @Test
    fun `get households above limit - sortBy and sortDirection reorder the result`() {
        val entities = (1..3).map { mockk<HouseholdEntity>(relaxed = true) }
        val households = (1..3).map { mockk<HouseholdResponse>(relaxed = true) }

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns entities
        entities.forEachIndexed { index, entity -> every { householdConverter.mapEntityToHousehold(entity) } returns households[index] }

        val totalSums = listOf(BigDecimal("1300"), BigDecimal("1100"), BigDecimal("1200"))
        every { incomeValidatorService.validateAll(any()) } answers {
            firstArg<List<List<IncomeValidatorPerson>>>().mapIndexed { index, _ ->
                Result.success(
                    IncomeValidatorResult(
                        valid = false,
                        totalSum = totalSums[index],
                        limit = BigDecimal("1000"),
                        toleranceValue = BigDecimal.ZERO,
                        amountExceededLimit = BigDecimal("100"),
                    ),
                )
            }
        }

        val result = service.getHouseholdsAboveLimit(sortBy = "totalSum", sortDirection = "asc")

        assertThat(result.items.map { it.totalSum }).containsExactly(
            BigDecimal("1100"),
            BigDecimal("1200"),
            BigDecimal("1300"),
        )
    }

    @Test
    fun `get households above limit - sorts by limit and by percentage exceeded`() {
        val entities = (1..3).map { mockk<HouseholdEntity>(relaxed = true) }
        val households = (1..3).map { mockk<HouseholdResponse>(relaxed = true) }

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns entities
        entities.forEachIndexed { index, entity -> every { householdConverter.mapEntityToHousehold(entity) } returns households[index] }

        // percentages: 100/1000 = 10%, 400/800 = 50%, 180/900 = 20%
        val limits = listOf(BigDecimal("1000"), BigDecimal("800"), BigDecimal("900"))
        val amounts = listOf(BigDecimal("100"), BigDecimal("400"), BigDecimal("180"))
        every { incomeValidatorService.validateAll(any()) } answers {
            firstArg<List<List<IncomeValidatorPerson>>>().mapIndexed { index, _ ->
                Result.success(
                    IncomeValidatorResult(
                        valid = false,
                        totalSum = limits[index] + amounts[index],
                        limit = limits[index],
                        toleranceValue = BigDecimal.ZERO,
                        amountExceededLimit = amounts[index],
                    ),
                )
            }
        }

        val byLimit = service.getHouseholdsAboveLimit(sortBy = "limit", sortDirection = "asc")
        assertThat(byLimit.items.map { it.limit }).containsExactly(
            BigDecimal("800"),
            BigDecimal("900"),
            BigDecimal("1000"),
        )

        // descending by default: 50% > 20% > 10%
        val byPercentage = service.getHouseholdsAboveLimit(sortBy = "percentageExceededLimit")
        assertThat(byPercentage.items.map { it.amountExceededLimit }).containsExactly(
            BigDecimal("400"),
            BigDecimal("180"),
            BigDecimal("100"),
        )
    }

    @Test
    fun `get households above limit - a household that cannot be validated is left out`() {
        val unvalidatableEntity = mockk<HouseholdEntity>(relaxed = true)
        val invalidEntity = mockk<HouseholdEntity>(relaxed = true)
        val invalidHousehold = mockk<HouseholdResponse>(relaxed = true)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns listOf(
            unvalidatableEntity,
            invalidEntity,
        )
        every { householdConverter.mapEntityToHousehold(invalidEntity) } returns invalidHousehold

        every { incomeValidatorService.validateAll(any()) } returns listOf(
            Result.failure(
                BusinessRuleException("Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: 0, Kinder: 2)!"),
            ),
            Result.success(
                IncomeValidatorResult(
                    valid = false,
                    totalSum = BigDecimal("1500"),
                    limit = BigDecimal("1000"),
                    toleranceValue = BigDecimal.ZERO,
                    amountExceededLimit = BigDecimal("500"),
                ),
            ),
        )

        val result = service.getHouseholdsAboveLimit()

        // the rejected household is skipped, the rest of the list is unaffected
        assertThat(result.items).hasSize(1)
        assertThat(result.items.first().household).isEqualTo(invalidHousehold)
        assertThat(result.totalCount).isEqualTo(1)
        verify(exactly = 0) { householdConverter.mapEntityToHousehold(unvalidatableEntity) }
    }

    @Test
    fun `get households above limit - income is validated from the household's own persons`() {
        val household = HouseholdEntity(householdId = 100, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            birthDate = LocalDate.of(1980, 1, 1)
            income = BigDecimal("1200")
            // the main person's own flags are deliberately ignored by the validation mapping
            excludeFromHousehold = true
            receivesFamilyAllowance = true
        }
        val childPerson = PersonEntity(household = household, country = testCountry1).apply {
            birthDate = LocalDate.of(2020, 5, 5)
            income = BigDecimal("50")
            excludeFromHousehold = true
            receivesFamilyAllowance = true
        }
        household.persons = mutableListOf(mainPerson, childPerson)
        household.mainPerson = mainPerson

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns listOf(household)

        val personsSlot = slot<List<List<IncomeValidatorPerson>>>()
        every { incomeValidatorService.validateAll(capture(personsSlot)) } returns listOf(
            Result.success(
                IncomeValidatorResult(
                    valid = true,
                    totalSum = BigDecimal("1250"),
                    limit = BigDecimal("2000"),
                    toleranceValue = BigDecimal.ZERO,
                    amountExceededLimit = BigDecimal.ZERO,
                ),
            ),
        )

        val result = service.getHouseholdsAboveLimit()

        assertThat(result.items).isEmpty()
        assertThat(personsSlot.captured).hasSize(1)
        assertThat(personsSlot.captured.first()).containsExactly(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("50"),
                birthDate = LocalDate.of(2020, 5, 5),
                excludeFromIncomeCalculation = true,
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1200"),
                birthDate = LocalDate.of(1980, 1, 1),
                excludeFromIncomeCalculation = false,
                receivesFamilyAllowance = false,
            ),
        )
        // validating a household costs no response mapping at all
        verify(exactly = 0) { householdConverter.mapEntityToHousehold(any()) }
    }

    @Test
    fun `get households above limit - paginates the computed result`() {
        val testHouseholdEntities = (1..30).map { mockk<HouseholdEntity>(relaxed = true) }
        val invalidHouseholds = (1..30).map { mockk<HouseholdResponse>(relaxed = true) }

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns testHouseholdEntities
        testHouseholdEntities.forEachIndexed { index, entity ->
            every { householdConverter.mapEntityToHousehold(entity) } returns invalidHouseholds[index]
        }

        every { incomeValidatorService.validateAll(any()) } answers {
            firstArg<List<List<IncomeValidatorPerson>>>().map {
                Result.success(
                    IncomeValidatorResult(
                        valid = false,
                        totalSum = BigDecimal("1500"),
                        limit = BigDecimal("1000"),
                        toleranceValue = BigDecimal.ZERO,
                        amountExceededLimit = BigDecimal("500"),
                    ),
                )
            }
        }

        val firstPage = service.getHouseholdsAboveLimit(page = 1, pageSize = 25)
        assertThat(firstPage.items).hasSize(25)
        assertThat(firstPage.items.first().household).isEqualTo(invalidHouseholds[0])
        assertThat(firstPage.totalCount).isEqualTo(30)
        assertThat(firstPage.currentPage).isEqualTo(1)
        assertThat(firstPage.totalPages).isEqualTo(2)
        assertThat(firstPage.pageSize).isEqualTo(25)

        val secondPage = service.getHouseholdsAboveLimit(page = 2, pageSize = 25)
        assertThat(secondPage.items).hasSize(5)
        assertThat(secondPage.items.first().household).isEqualTo(invalidHouseholds[25])
        assertThat(secondPage.currentPage).isEqualTo(2)
        assertThat(secondPage.totalPages).isEqualTo(2)

        // each household was mapped to a response exactly once - by the page view that returned it,
        // not by both page views
        testHouseholdEntities.forEach { entity ->
            verify(exactly = 1) { householdConverter.mapEntityToHousehold(entity) }
        }
    }

    @Test
    fun `generate above limit csv - exports every household above the limit, not just one page`() {
        val entities = (1..30).map { mockk<HouseholdEntity>(relaxed = true) }
        val households = (1..30).map {
            mockk<HouseholdResponse>(relaxed = true) {
                every { id } returns it.toLong()
                every { mainPerson() } returns null
                every { validUntil } returns null
                every { address } returns HouseholdAddress(street = "Teststraße", houseNumber = "1", postalCode = 1020, city = "Wien")
            }
        }

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns entities
        entities.forEachIndexed { index, entity -> every { householdConverter.mapEntityToHousehold(entity) } returns households[index] }

        every { incomeValidatorService.validateAll(any()) } answers {
            firstArg<List<List<IncomeValidatorPerson>>>().map {
                Result.success(
                    IncomeValidatorResult(
                        valid = false,
                        totalSum = BigDecimal("1500"),
                        limit = BigDecimal("1000"),
                        toleranceValue = BigDecimal.ZERO,
                        amountExceededLimit = BigDecimal("500"),
                    ),
                )
            }
        }

        val result = service.generateAboveLimitCsv()

        assertThat(result.filename).startsWith("kunden_ueber_limit_").endsWith(".csv")
        val csvContent = String(result.bytes)
        val lines = csvContent.trim().lines()
        // header + 30 households, unpaginated
        assertThat(lines).hasSize(31)
        assertThat(lines[0]).isEqualTo("Nr.;Name;Adresse;Gültig bis;Einkommen gesamt;Limit;Über Limit;% über Limit")
        assertThat(lines[1]).contains("Teststraße 1, 1020 Wien").contains("1500").contains("50.0")
    }

    @Test
    fun `get households overview - explicit distributionId returns new and renewed households of that distribution`() {
        val distribution = mockk<DistributionEntity>(relaxed = true) {
            every { id } returns 100
            every { startedAt } returns LocalDateTime.of(2026, 1, 1, 8, 0)
            every { endedAt } returns LocalDateTime.of(2026, 1, 1, 18, 0)
        }
        every { distributionRepository.findById(100) } returns Optional.of(distribution)

        val newHouseholdEntity = mockk<HouseholdEntity>(relaxed = true) {
            every { createdAt } returns LocalDateTime.of(2026, 1, 1, 9, 0)
        }
        val renewedHouseholdEntity = mockk<HouseholdEntity>(relaxed = true) {
            every { prolongedAt } returns LocalDateTime.of(2026, 1, 1, 10, 0)
        }
        val newHousehold = mockk<HouseholdResponse>(relaxed = true)
        val renewedHousehold = mockk<HouseholdResponse>(relaxed = true)

        every {
            householdRepository.findAllByCreatedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        } returns listOf(newHouseholdEntity)
        every {
            householdRepository.findAllByProlongedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        } returns listOf(renewedHouseholdEntity)
        every { householdConverter.mapEntityToHousehold(newHouseholdEntity) } returns newHousehold
        every { householdConverter.mapEntityToHousehold(renewedHouseholdEntity) } returns renewedHousehold

        val result = service.getHouseholdsOverview(100)

        assertThat(result.distributionId).isEqualTo(100)
        assertThat(result.distributionStartedAt).isEqualTo(distribution.startedAt)
        assertThat(result.distributionEndedAt).isEqualTo(distribution.endedAt)
        assertThat(result.newHouseholds).hasSize(1)
        assertThat(result.newHouseholds.first().household).isEqualTo(newHousehold)
        assertThat(result.newHouseholds.first().date).isEqualTo(newHouseholdEntity.createdAt)
        assertThat(result.renewedHouseholds).hasSize(1)
        assertThat(result.renewedHouseholds.first().household).isEqualTo(renewedHousehold)
        assertThat(result.renewedHouseholds.first().date).isEqualTo(renewedHouseholdEntity.prolongedAt)
    }

    @Test
    fun `get households overview - unknown distributionId throws NotFoundException`() {
        every { distributionRepository.findById(999) } returns Optional.empty()

        assertThrows<NotFoundException> { service.getHouseholdsOverview(999) }
    }

    @Test
    fun `get households overview - no distributionId falls back to the newest closed distribution`() {
        val distributionStartedAt = LocalDateTime.of(2026, 2, 7, 8, 0)
        val distributionEndedAt = LocalDateTime.of(2026, 2, 7, 18, 0)
        val distribution = mockk<DistributionEntity>(relaxed = true) {
            every { id } returns 200
            every { startedAt } returns distributionStartedAt
            every { endedAt } returns distributionEndedAt
        }
        every { distributionRepository.findFirstByEndedAtIsNotNullOrderByStartedAtDesc() } returns distribution
        every { householdRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { householdRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()

        val result = service.getHouseholdsOverview(null)

        assertThat(result.distributionId).isEqualTo(200)
        assertThat(result.distributionEndedAt).isEqualTo(distributionEndedAt)
        assertThat(result.newHouseholds).isEmpty()
        assertThat(result.renewedHouseholds).isEmpty()
        verify {
            householdRepository.findAllByCreatedAtBetween(distributionStartedAt, distributionEndedAt)
            householdRepository.findAllByProlongedAtBetween(distributionStartedAt, distributionEndedAt)
        }
    }

    @Test
    fun `get households overview - explicit distributionId of an open distribution uses now as end`() {
        val distributionStartedAt = LocalDateTime.now().minusHours(2)
        val distribution = mockk<DistributionEntity>(relaxed = true) {
            every { id } returns 300
            every { startedAt } returns distributionStartedAt
            every { endedAt } returns null
        }
        every { distributionRepository.findById(300) } returns Optional.of(distribution)
        every { householdRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { householdRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()

        val result = service.getHouseholdsOverview(300)

        assertThat(result.distributionId).isEqualTo(300)
        assertThat(result.distributionEndedAt).isNull()
        verify {
            householdRepository.findAllByCreatedAtBetween(distributionStartedAt, any())
            householdRepository.findAllByProlongedAtBetween(distributionStartedAt, any())
        }
    }

    @Test
    fun `get households overview - no closed distributions at all returns empty response`() {
        every { distributionRepository.findFirstByEndedAtIsNotNullOrderByStartedAtDesc() } returns null

        val result = service.getHouseholdsOverview(null)

        assertThat(result.distributionId).isNull()
        assertThat(result.distributionStartedAt).isNull()
        assertThat(result.distributionEndedAt).isNull()
        assertThat(result.newHouseholds).isEmpty()
        assertThat(result.renewedHouseholds).isEmpty()
        verify(exactly = 0) { householdRepository.findAllByCreatedAtBetween(any(), any()) }
        verify(exactly = 0) { householdRepository.findAllByProlongedAtBetween(any(), any()) }
    }

    @Test
    fun `generate households overview csv - builds rows for new and renewed households`() {
        val distribution = mockk<DistributionEntity>(relaxed = true) {
            every { id } returns 100
            every { startedAt } returns LocalDateTime.of(2026, 1, 3, 8, 0)
            every { endedAt } returns LocalDateTime.of(2026, 1, 3, 18, 0)
        }
        every { distributionRepository.findById(100) } returns Optional.of(distribution)

        val newHouseholdEntity = mockk<HouseholdEntity>(relaxed = true) {
            every { createdAt } returns LocalDateTime.of(2026, 1, 3, 9, 15)
        }
        val renewedHouseholdEntity = mockk<HouseholdEntity>(relaxed = true) {
            every { prolongedAt } returns LocalDateTime.of(2026, 1, 3, 10, 30)
        }

        val newHousehold = HouseholdResponse(
            id = 5,
            address = HouseholdAddress(
                street = "Teststraße",
                houseNumber = "12",
                stairway = "2",
                door = "5",
                postalCode = 1010,
                city = "Wien",
            ),
            validUntil = LocalDate.now().plusMonths(1),
            locked = false,
            persons = listOf(
                Person(isMainPerson = true, firstname = "Max", lastname = "Mustermann", birthDate = LocalDate.of(1990, 1, 1), gender = null, country = testCountry),
                Person(isMainPerson = false, firstname = "Erika", lastname = "Mustermann", birthDate = LocalDate.of(1992, 1, 1), gender = null, country = testCountry),
                Person(
                    isMainPerson = false,
                    firstname = "Fritz",
                    lastname = "Mustermann",
                    birthDate = LocalDate.of(1995, 1, 1),
                    gender = null,
                    country = testCountry,
                    excludeFromHousehold = true,
                ),
            ),
        )
        val renewedHousehold = HouseholdResponse(
            id = 20,
            address = HouseholdAddress(street = "Beispielweg", houseNumber = "3", postalCode = 1020, city = "Wien"),
            validUntil = LocalDate.now().minusDays(1),
            locked = true,
            persons = listOf(
                Person(isMainPerson = true, firstname = "Anna", lastname = "Beispiel", birthDate = LocalDate.of(1985, 5, 5), gender = null, country = testCountry),
            ),
        )

        every {
            householdRepository.findAllByCreatedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        } returns listOf(newHouseholdEntity)
        every {
            householdRepository.findAllByProlongedAtBetween(distribution.startedAt!!, distribution.endedAt!!)
        } returns listOf(renewedHouseholdEntity)
        every { householdConverter.mapEntityToHousehold(newHouseholdEntity) } returns newHousehold
        every { householdConverter.mapEntityToHousehold(renewedHouseholdEntity) } returns renewedHousehold

        val result = service.generateHouseholdsOverviewCsv(100)

        val lines = String(result.bytes, Charsets.UTF_8).trim().lines()
        assertThat(lines).hasSize(3)
        assertThat(lines[0]).isEqualTo("Typ;Nr.;Name;Adresse;Personen;Gültigkeit;Datum")
        assertThat(lines[1]).isEqualTo("Neu;5;Mustermann Max;Teststraße 12, Stiege 2, Top 5, 1010 Wien;2;Gültig;03.01.2026 09:15")
        assertThat(lines[2]).isEqualTo("Verlängert;20;Beispiel Anna;Beispielweg 3, 1020 Wien;1;Gesperrt;03.01.2026 10:30")
    }

    @Test
    fun `generate households overview csv - filename contains the distribution date`() {
        val distribution = mockk<DistributionEntity>(relaxed = true) {
            every { id } returns 100
            every { startedAt } returns LocalDateTime.of(2026, 1, 3, 8, 0)
            every { endedAt } returns LocalDateTime.of(2026, 1, 3, 18, 0)
        }
        every { distributionRepository.findById(100) } returns Optional.of(distribution)
        every { householdRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { householdRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()

        val result = service.generateHouseholdsOverviewCsv(100)

        assertThat(result.filename).isEqualTo("kunden-uebersicht_2026-01-03.csv")
    }

    @Test
    fun `generate pdf household - not found`() {
        every { householdRepository.findByHouseholdId(any()) } returns null

        val result = service.generatePdf(1, HouseholdPdfType.MASTERDATA)

        assertThat(result).isNull()
        verify(exactly = 0) { auditLogWriter.record(any()) }
    }

    @Test
    fun `generate pdf household - found`() {
        val testHouseholdEntity = testHouseholdEntityWithMainPerson().apply { id = 42 }

        val pdfBytes = ByteArray(10)
        every { householdRepository.findByHouseholdId(any()) } returns testHouseholdEntity
        every { householdPdfService.generateMasterdataPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, HouseholdPdfType.MASTERDATA)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("stammdaten-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())

        val entrySlot = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo("Household")
        assertThat(entrySlot.captured.entityId).isEqualTo(42L)
        assertThat(entrySlot.captured.businessKey).isEqualTo("100")
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.changedFields).isEmpty()
    }

    @Test
    fun `generate pdf household - umlauts and ß are transliterated, not just dropped`() {
        val household = HouseholdEntity(householdId = 115, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = 1
            firstname = "Georg"
            lastname = "Großfamilie"
        }
        household.persons = mutableListOf(mainPerson)
        household.mainPerson = mainPerson

        val pdfBytes = ByteArray(10)
        every { householdRepository.findByHouseholdId(any()) } returns household
        every { householdPdfService.generateMasterdataPdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, HouseholdPdfType.MASTERDATA)

        assertThat(result?.filename).isEqualTo("stammdaten-115-grossfamilie-georg.pdf")
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
    fun `generate pdf household - PRIVACY_NOTICE type`() {
        val testHouseholdEntity = testHouseholdEntityWithMainPerson()

        val pdfBytes = ByteArray(10)
        every { householdRepository.findByHouseholdId(any()) } returns testHouseholdEntity
        every { householdPdfService.generatePrivacyNoticePdf(any()) } returns pdfBytes

        val result = service.generatePdf(1, HouseholdPdfType.PRIVACY_NOTICE)

        assertThat(result).isNotNull
        assertThat(result?.filename).isEqualTo("datenschutzerklaerung-100-mustermann-max.pdf")
        assertThat(result?.bytes?.size).isEqualTo(pdfBytes.size.toLong())
        verify(exactly = 1) { householdPdfService.generatePrivacyNoticePdf(testHouseholdEntity) }
    }

    @Test
    fun `generate privacy notice template pdf - no household lookup or audit log`() {
        val pdfBytes = ByteArray(10)
        every { householdPdfService.generatePrivacyNoticeTemplatePdf() } returns pdfBytes

        val result = service.generatePrivacyNoticeTemplatePdf()

        assertThat(result.filename).isEqualTo("datenschutzerklaerung-vorlage.pdf")
        assertThat(result.bytes).isEqualTo(pdfBytes)
        verify(exactly = 0) { householdRepository.findByHouseholdId(any()) }
        verify(exactly = 0) { auditLogWriter.record(any()) }
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
    fun `delete household by householdId deletes document files from disk`() {
        val householdId = 123L
        val testHouseholdEntity = testHouseholdEntityWithMainPerson()
        val document1 = DocumentEntity(
            household = testHouseholdEntity,
            documentType = DocumentType.OTHER,
            fileName = "doc1.pdf",
            contentType = "application/pdf",
            storagePath = "/documents/123/doc1.pdf",
        )
        val document2 = DocumentEntity(
            household = testHouseholdEntity,
            documentType = DocumentType.OTHER,
            fileName = "doc2.png",
            contentType = "image/png",
            storagePath = "/documents/123/doc2.png",
        )
        testHouseholdEntity.documents = mutableListOf(document1, document2)
        every { householdRepository.findByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity

        service.deleteHouseholdByHouseholdId(householdId)

        verify(exactly = 1) { documentStorageService.delete("/documents/123/doc1.pdf") }
        verify(exactly = 1) { documentStorageService.delete("/documents/123/doc2.png") }
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

        val testHouseholdUpdate = mockk<HouseholdRequest>(relaxed = true)
        every { testHouseholdUpdate.id } returns householdId
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)

        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now())
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdConverter.mapHouseholdToEntity(any(), any()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse
        every { householdRepository.saveAndFlush(any()) } returns testHouseholdEntity

        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = false,
            totalSum = BigDecimal("1"),
            limit = BigDecimal("2"),
            toleranceValue = BigDecimal("3"),
            amountExceededLimit = BigDecimal("4"),
        )

        val result =
            service.updateHousehold(testHouseholdUpdate.id!!, testHouseholdUpdate, force = true, isSupervisor = false)

        assertThat(result).isEqualTo(
            HouseholdUpdateResponse(
                data = testHouseholdResponse,
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            ),
        )
        assertThat(testHouseholdEntity.validUntil).isEqualTo(LocalDate.now().minusDays(1))
        verify(exactly = 1) { householdConverter.mapHouseholdToEntity(any(), any()) }
    }

    @Test
    fun `pay cost contribution - null amount pays off the full pending amount`() {
        val householdId = 123L
        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now()).apply { pendingCostContribution = BigDecimal("20.00") }
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse

        val result = service.payCostContribution(householdId, null)

        assertThat(result).isEqualTo(testHouseholdResponse)
        assertThat(testHouseholdEntity.pendingCostContribution).isEqualTo(BigDecimal.ZERO)
        verify(exactly = 1) { householdRepository.saveAndFlush(testHouseholdEntity) }
    }

    @Test
    fun `pay cost contribution - amount is subtracted from the pending amount`() {
        val householdId = 123L
        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now()).apply { pendingCostContribution = BigDecimal("20.00") }
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse

        val result = service.payCostContribution(householdId, BigDecimal("4.00"))

        assertThat(result).isEqualTo(testHouseholdResponse)
        assertThat(testHouseholdEntity.pendingCostContribution).isEqualTo(BigDecimal("16.00"))
    }

    @Test
    fun `pay cost contribution - amount larger than the pending amount clamps at zero`() {
        val householdId = 123L
        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now()).apply { pendingCostContribution = BigDecimal("4.00") }
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse

        val result = service.payCostContribution(householdId, BigDecimal("20.00"))

        assertThat(result).isEqualTo(testHouseholdResponse)
        assertThat(testHouseholdEntity.pendingCostContribution).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `edit cost contribution - amount is set directly`() {
        val householdId = 123L
        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now()).apply { pendingCostContribution = BigDecimal("20.00") }
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse

        val result = service.editCostContribution(householdId, BigDecimal("500.00"))

        assertThat(result).isEqualTo(testHouseholdResponse)
        assertThat(testHouseholdEntity.pendingCostContribution).isEqualTo(BigDecimal("500.00"))
        verify(exactly = 1) { householdRepository.saveAndFlush(testHouseholdEntity) }
    }

    @Test
    fun `edit cost contribution - negative amount is clamped at zero`() {
        val householdId = 123L
        val testHouseholdEntity = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now()).apply { pendingCostContribution = BigDecimal("20.00") }
        val testHouseholdResponse = mockk<HouseholdResponse>(relaxed = true)
        every { householdRepository.getReferenceByHouseholdId(householdId) } returns testHouseholdEntity
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } returns testHouseholdEntity
        every { householdConverter.mapEntityToHousehold(testHouseholdEntity) } returns testHouseholdResponse

        val result = service.editCostContribution(householdId, BigDecimal("-5.00"))

        assertThat(result).isEqualTo(testHouseholdResponse)
        assertThat(testHouseholdEntity.pendingCostContribution).isEqualTo(BigDecimal.ZERO)
    }

    private fun testHouseholdEntityWithMainPerson(): HouseholdEntity {
        val household = HouseholdEntity(householdId = 100, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = 1
            firstname = "max"
            lastname = "mustermann"
        }
        household.persons = mutableListOf(mainPerson)
        household.mainPerson = mainPerson
        return household
    }
}

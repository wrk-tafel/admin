package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorService
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * [HouseholdService.prolongHousehold] and [HouseholdService.deactivateHousehold] - the two actions
 * that change nothing but a stored household's validity, and so have to work on one whose remaining
 * data is incomplete.
 */
class HouseholdServiceValidityTest {

    private val incomeValidatorService = mockk<IncomeValidatorService>()
    private val householdRepository = mockk<HouseholdRepository>(relaxed = true)
    private val householdConverter = mockk<HouseholdConverter>()
    private val clock: Clock = Clock.fixed(Instant.parse("2026-10-03T10:00:00Z"), ZoneId.of("UTC"))
    private val response = mockk<HouseholdResponse>()

    private lateinit var service: HouseholdService
    private lateinit var household: HouseholdEntity

    @BeforeEach
    fun beforeEach() {
        service = HouseholdService(
            incomeValidatorService = incomeValidatorService,
            householdRepository = householdRepository,
            householdPdfService = mockk(),
            householdConverter = householdConverter,
            documentStorageService = mockk(),
            documentRepository = mockk(),
            distributionRepository = mockk(),
            tafelAdminProperties = mockk(),
            householdDuplicationService = mockk(),
            auditLogWriter = mockk(),
            auditLogRepository = mockk(),
            auditActorProvider = mockk(),
            clock = clock,
            advisoryLockService = mockk(),
        )

        // incomplete on purpose: a main person with a birth date but neither a name nor a gender
        household = HouseholdEntity(householdId = 1, validUntil = LocalDate.of(2026, 11, 30))
        household.persons = mutableListOf(
            PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
                birthDate = LocalDate.of(1980, 1, 1)
            },
        )

        every { householdRepository.findByHouseholdId(1) } returns household
        every { householdRepository.saveAndFlush(any<HouseholdEntity>()) } answers { firstArg() }
        every { householdConverter.mapEntityToHousehold(any()) } returns response
        incomeIs(valid = true)
    }

    private fun incomeIs(valid: Boolean) {
        every { incomeValidatorService.validate(any()) } returns IncomeValidatorResult(
            valid = valid,
            totalSum = BigDecimal.ONE,
            limit = BigDecimal.ONE,
            toleranceValue = BigDecimal.ZERO,
            amountExceededLimit = BigDecimal.ZERO,
        )
    }

    @Test
    fun `prolonging moves validUntil out by the given months and stamps prolongedAt`() {
        val result = service.prolongHousehold(1, 3, force = false, isSupervisor = false)

        assertThat(result.data).isSameAs(response)
        assertThat(result.errorMsg).isNull()
        assertThat(household.validUntil).isEqualTo(LocalDate.of(2027, 2, 28))
        assertThat(household.prolongedAt).isEqualTo(LocalDateTime.of(2026, 10, 3, 10, 0))
        verify { householdRepository.saveAndFlush(household) }
    }

    @Test
    fun `prolonging an unknown household fails`() {
        every { householdRepository.findByHouseholdId(99) } returns null

        assertThatThrownBy { service.prolongHousehold(99, 3, force = false, isSupervisor = false) }
            .isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `prolonging a household with a person without a birth date is refused before any income check`() {
        household.persons.add(PersonEntity(household = household, country = testCountry1, isMainPerson = false))

        assertThatThrownBy { service.prolongHousehold(1, 3, force = true, isSupervisor = true) }
            .isInstanceOf(BusinessRuleException::class.java)
            .hasMessageContaining("Geburtsdatum")

        assertThat(household.validUntil).isEqualTo(LocalDate.of(2026, 11, 30))
        verify(exactly = 0) { incomeValidatorService.validate(any()) }
        verify(exactly = 0) { householdRepository.saveAndFlush(any<HouseholdEntity>()) }
    }

    @Test
    fun `prolonging above the income limit is a conflict for a supervisor until forced`() {
        incomeIs(valid = false)

        assertThatThrownBy { service.prolongHousehold(1, 3, force = false, isSupervisor = true) }
            .isInstanceOf(ConflictException::class.java)
        assertThat(household.validUntil).isEqualTo(LocalDate.of(2026, 11, 30))
        verify(exactly = 0) { householdRepository.saveAndFlush(any<HouseholdEntity>()) }

        val result = service.prolongHousehold(1, 3, force = true, isSupervisor = true)

        assertThat(result.errorMsg).isNull()
        assertThat(household.validUntil).isEqualTo(LocalDate.of(2027, 2, 28))
        assertThat(household.prolongedAt).isEqualTo(LocalDateTime.of(2026, 10, 3, 10, 0))
    }

    @Test
    fun `prolonging above the income limit saves the household as invalid for a non-supervisor`() {
        incomeIs(valid = false)
        household.prolongedAt = LocalDateTime.of(2026, 1, 1, 9, 0)

        val result = service.prolongHousehold(1, 3, force = true, isSupervisor = false)

        assertThat(result.data).isSameAs(response)
        assertThat(result.errorMsg).isEqualTo("Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet")
        assertThat(household.validUntil).isEqualTo(LocalDate.of(2026, 10, 2))
        assertThat(household.prolongedAt).isNull()
        verify { householdRepository.saveAndFlush(household) }
    }

    @Test
    fun `deactivating ends the validity yesterday without an income check`() {
        // a person without a birth date would make an income check impossible - none is run
        household.persons.add(PersonEntity(household = household, country = testCountry1, isMainPerson = false))

        val result = service.deactivateHousehold(1)

        assertThat(result).isSameAs(response)
        assertThat(household.validUntil).isEqualTo(LocalDate.of(2026, 10, 2))
        verify { householdRepository.saveAndFlush(household) }
        verify(exactly = 0) { incomeValidatorService.validate(any()) }
    }

    @Test
    fun `deactivating an unknown household fails`() {
        every { householdRepository.findByHouseholdId(99) } returns null

        assertThatThrownBy { service.deactivateHousehold(99) }.isInstanceOf(NotFoundException::class.java)
    }
}

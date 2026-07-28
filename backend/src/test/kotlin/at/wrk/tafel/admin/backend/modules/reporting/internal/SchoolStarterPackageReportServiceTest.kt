package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
internal class SchoolStarterPackageReportServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var staticValueRepository: StaticValueRepository

    @InjectMockKs
    private lateinit var service: SchoolStarterPackageReportService

    private fun mockAgeRange(min: Int, max: Int) {
        every {
            staticValueRepository.findSingleValueOfType(StaticValueType.SCHOOL_STARTER_PACKAGE_AGE_MIN, any())
        } returns StaticValueEntity().apply { age = min }
        every {
            staticValueRepository.findSingleValueOfType(StaticValueType.SCHOOL_STARTER_PACKAGE_AGE_MAX, any())
        } returns StaticValueEntity().apply { age = max }
    }

    private fun person(firstname: String, lastname: String, age: Int, isMainPerson: Boolean = false): PersonEntity =
        PersonEntity().apply {
            this.firstname = firstname
            this.lastname = lastname
            this.birthDate = LocalDate.now().minusYears(age.toLong())
            this.isMainPerson = isMainPerson
        }

    private fun household(householdId: Long, vararg persons: PersonEntity): HouseholdEntity =
        HouseholdEntity().apply {
            this.householdId = householdId
            persons.forEach { this.persons.add(it) }
        }

    @Test
    fun `includes only additional persons within the configured age range`() {
        mockAgeRange(6, 10)

        val mainPerson = person("Main", "Person", age = 40, isMainPerson = true)
        val childInRange = person("Kind", "InRange", age = 8)
        val childBelowRange = person("Kind", "TooYoung", age = 5)
        val childAboveRange = person("Kind", "TooOld", age = 11)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns listOf(
            household(1L, mainPerson, childInRange, childBelowRange, childAboveRange),
        )

        val result = service.generateCsv()
        val csvContent = String(result.bytes, Charsets.UTF_8)

        assertThat(csvContent).contains("Kind;InRange;8")
        assertThat(csvContent).doesNotContain("TooYoung")
        assertThat(csvContent).doesNotContain("TooOld")
        assertThat(csvContent).doesNotContain("Main;Person")
    }

    @Test
    fun `includes ages at the inclusive boundaries`() {
        mockAgeRange(6, 10)

        val childAtMin = person("Kind", "AtMin", age = 6)
        val childAtMax = person("Kind", "AtMax", age = 10)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns listOf(
            household(1L, childAtMin, childAtMax),
        )

        val csvContent = String(service.generateCsv().bytes, Charsets.UTF_8)

        assertThat(csvContent).contains("AtMin")
        assertThat(csvContent).contains("AtMax")
    }

    @Test
    fun `rows are ordered by household id`() {
        mockAgeRange(6, 10)

        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns listOf(
            household(20L, person("B", "Household20", age = 7)),
            household(5L, person("A", "Household5", age = 7)),
        )

        val csvContent = String(service.generateCsv().bytes, Charsets.UTF_8)

        val household5Index = csvContent.indexOf("Household5")
        val household20Index = csvContent.indexOf("Household20")
        assertThat(household5Index).isLessThan(household20Index)
    }

    @Test
    fun `filename contains todays date`() {
        mockAgeRange(6, 10)
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns emptyList()

        val result = service.generateCsv()

        assertThat(result.filename).startsWith("schulstartpakete_")
        assertThat(result.filename).endsWith(".csv")
    }

    @Test
    fun `throws when age range is not configured`() {
        every { staticValueRepository.findSingleValueOfType(any<StaticValueType>(), any<LocalDate>()) } returns null
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns emptyList()

        assertThatThrownBy { service.generateCsv() }
            .isInstanceOf(IllegalStateException::class.java)
    }
}

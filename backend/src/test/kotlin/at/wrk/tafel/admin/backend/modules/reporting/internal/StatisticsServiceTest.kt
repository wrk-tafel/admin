package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.reporting.ChildAgeCountItem
import at.wrk.tafel.admin.backend.modules.reporting.ChildItem
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDetail
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsResponse
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import jakarta.persistence.EntityManager
import jakarta.persistence.Query
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class StatisticsServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var personRepository: PersonRepository

    @RelaxedMockK
    private lateinit var entityManager: EntityManager

    @InjectMockKs
    private lateinit var service: StatisticsService

    @Test
    fun `getSettings returns available years and distribution dates sorted descending`() {
        val distribution1 = DistributionEntity(startedAt = LocalDateTime.of(2023, 5, 15, 10, 0), startedByUser = testUserEntity).apply {
            id = 1
            endedAt = LocalDateTime.of(2023, 5, 15, 12, 0)
        }
        val distribution2 = DistributionEntity(startedAt = LocalDateTime.of(2024, 3, 20, 9, 30), startedByUser = testUserEntity).apply {
            id = 2
            endedAt = LocalDateTime.of(2024, 3, 20, 11, 30)
        }
        val distribution3 = DistributionEntity(startedAt = LocalDateTime.of(2024, 8, 10, 11, 0), startedByUser = testUserEntity).apply {
            id = 3
            endedAt = LocalDateTime.of(2024, 8, 10, 13, 0)
        }
        val distribution4 = DistributionEntity(startedAt = LocalDateTime.of(2022, 12, 5, 14, 0), startedByUser = testUserEntity).apply {
            id = 4
            endedAt = LocalDateTime.of(2022, 12, 5, 16, 0)
        }

        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            distribution1,
            distribution2,
            distribution3,
            distribution4,
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024, 2023, 2022)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 8, 10, 11, 0),
                endDate = LocalDateTime.of(2024, 8, 10, 13, 0),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 3, 20, 9, 30),
                endDate = LocalDateTime.of(2024, 3, 20, 11, 30),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2023, 5, 15, 10, 0),
                endDate = LocalDateTime.of(2023, 5, 15, 12, 0),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2022, 12, 5, 14, 0),
                endDate = LocalDateTime.of(2022, 12, 5, 16, 0),
            ),
        )
    }

    @Test
    fun `getSettings handles empty distributions list`() {
        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns emptyList()

        val result = service.getSettings()

        assertThat(result.availableYears).isEmpty()
        assertThat(result.distributions).isEmpty()
    }

    @Test
    fun `getSettings returns distinct years when multiple distributions in same year`() {
        val distribution1 = DistributionEntity(startedAt = LocalDateTime.of(2024, 1, 15, 10, 0), startedByUser = testUserEntity).apply {
            id = 1
            endedAt = LocalDateTime.of(2024, 1, 15, 12, 0)
        }
        val distribution2 = DistributionEntity(startedAt = LocalDateTime.of(2024, 5, 20, 9, 30), startedByUser = testUserEntity).apply {
            id = 2
            endedAt = LocalDateTime.of(2024, 5, 20, 11, 30)
        }
        val distribution3 = DistributionEntity(startedAt = LocalDateTime.of(2024, 12, 10, 11, 0), startedByUser = testUserEntity).apply {
            id = 3
            endedAt = LocalDateTime.of(2024, 12, 10, 13, 0)
        }

        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            distribution1,
            distribution2,
            distribution3,
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024)
        assertThat(result.distributions).hasSize(3)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 12, 10, 11, 0),
                endDate = LocalDateTime.of(2024, 12, 10, 13, 0),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 5, 20, 9, 30),
                endDate = LocalDateTime.of(2024, 5, 20, 11, 30),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 1, 15, 12, 0),
            ),
        )
    }

    @Test
    fun `getSettings sorts years in descending order`() {
        val distribution1 = DistributionEntity(startedAt = LocalDateTime.of(2020, 1, 1, 10, 0), startedByUser = testUserEntity).apply {
            id = 1
            endedAt = LocalDateTime.of(2020, 1, 1, 12, 0)
        }
        val distribution2 = DistributionEntity(startedAt = LocalDateTime.of(2025, 1, 1, 10, 0), startedByUser = testUserEntity).apply {
            id = 2
            endedAt = LocalDateTime.of(2025, 1, 1, 12, 0)
        }
        val distribution3 = DistributionEntity(startedAt = LocalDateTime.of(2022, 1, 1, 10, 0), startedByUser = testUserEntity).apply {
            id = 3
            endedAt = LocalDateTime.of(2022, 1, 1, 12, 0)
        }
        val distribution4 = DistributionEntity(startedAt = LocalDateTime.of(2021, 1, 1, 10, 0), startedByUser = testUserEntity).apply {
            id = 4
            endedAt = LocalDateTime.of(2021, 1, 1, 12, 0)
        }

        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            distribution1,
            distribution2,
            distribution3,
            distribution4,
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2025, 2022, 2021, 2020)
    }

    @Test
    fun `getSettings sorts distribution dates in descending order`() {
        val distribution1 = DistributionEntity(startedAt = LocalDateTime.of(2024, 1, 1, 8, 0), startedByUser = testUserEntity).apply {
            id = 1
            endedAt = LocalDateTime.of(2024, 1, 1, 10, 0)
        }
        val distribution2 = DistributionEntity(startedAt = LocalDateTime.of(2024, 1, 1, 14, 0), startedByUser = testUserEntity).apply {
            id = 2
            endedAt = LocalDateTime.of(2024, 1, 1, 16, 0)
        }
        val distribution3 = DistributionEntity(startedAt = LocalDateTime.of(2024, 1, 1, 11, 30), startedByUser = testUserEntity).apply {
            id = 3
            endedAt = LocalDateTime.of(2024, 1, 1, 13, 30)
        }

        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            distribution1,
            distribution2,
            distribution3,
        )

        val result = service.getSettings()

        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 14, 0),
                endDate = LocalDateTime.of(2024, 1, 1, 16, 0),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 11, 30),
                endDate = LocalDateTime.of(2024, 1, 1, 13, 30),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 8, 0),
                endDate = LocalDateTime.of(2024, 1, 1, 10, 0),
            ),
        )
    }

    @Test
    fun `getSettings with single distribution`() {
        val distribution = DistributionEntity(startedAt = LocalDateTime.of(2024, 6, 15, 10, 0), startedByUser = testUserEntity).apply {
            id = 1
            endedAt = LocalDateTime.of(2024, 6, 15, 12, 0)
        }

        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(distribution)

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 6, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 6, 15, 12, 0),
            ),
        )
    }

    @Test
    fun `getSettings filters out open distributions without endedAt`() {
        val closedDistribution1 = DistributionEntity(startedAt = LocalDateTime.of(2024, 5, 15, 10, 0), startedByUser = testUserEntity).apply {
            id = 1
            endedAt = LocalDateTime.of(2024, 5, 15, 12, 0)
        }
        val openDistribution = DistributionEntity(startedAt = LocalDateTime.of(2024, 6, 20, 9, 30), startedByUser = testUserEntity).apply {
            id = 2
            endedAt = null
        }
        val closedDistribution2 = DistributionEntity(startedAt = LocalDateTime.of(2023, 3, 10, 11, 0), startedByUser = testUserEntity).apply {
            id = 3
            endedAt = LocalDateTime.of(2023, 3, 10, 13, 0)
        }

        every { distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc() } returns listOf(
            closedDistribution1,
            openDistribution,
            closedDistribution2,
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024, 2023)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 5, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 5, 15, 12, 0),
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2023, 3, 10, 11, 0),
                endDate = LocalDateTime.of(2023, 3, 10, 13, 0),
            ),
        )
    }

    @Test
    fun `executeStatsQuery formats double values independent of the default locale`() {
        val fromDate = LocalDate.now().minusDays(7)
        val toDate = LocalDate.now()

        val mockQuery = mockk<Query>(relaxed = true)
        every { entityManager.createNativeQuery(any<String>()) } returns mockQuery
        every { mockQuery.resultList } returns listOf(
            arrayOf<Any>("KW1", 0.0),
            arrayOf<Any>("KW2", 1.5),
        )

        val result = service.averageShelters(fromDate, toDate)

        assertThat(result).containsExactly(
            StatisticsResult(label = "KW1", value = 0.0),
            StatisticsResult(label = "KW2", value = 1.5),
        )
    }

    @Test
    fun `executeStatsQuery defaults to zero when value column is null`() {
        val fromDate = LocalDate.now().minusDays(7)
        val toDate = LocalDate.now()

        val mockQuery = mockk<Query>(relaxed = true)
        every { entityManager.createNativeQuery(any<String>()) } returns mockQuery
        every { mockQuery.resultList } returns listOf(
            arrayOf<Any?>("KW1", null),
        )

        val result = service.averageShelters(fromDate, toDate)

        assertThat(result).containsExactly(
            StatisticsResult(label = "KW1", value = 0),
        )
    }

    @Test
    fun `get data`() {
        val fromDate = LocalDate.now().minusDays(7)
        val toDate = LocalDate.now()

        val mockQuery = mockk<Query>(relaxed = true)
        every { entityManager.createNativeQuery(any<String>()) } returns mockQuery
        every { mockQuery.resultList } returns listOf(
            arrayOf<Any>("Jänner", 10L),
            arrayOf<Any>("Februar", 20L),
            arrayOf<Any>("März", 30L),
        )

        val result = service.getData(fromDate, toDate)

        val expectedLabels = listOf("Jänner", "Februar", "März")
        val expectedDataPoints: List<Number> = listOf(10L, 20L, 30L)

        assertThat(result).isEqualTo(
            StatisticsResponse(
                beneficiaryCustomers = StatisticsDetail(
                    title = "30",
                    subTitle = "Bezugsberechtigte Haushalte",
                    value = 30.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                beneficiaryPersons = StatisticsDetail(
                    title = "30",
                    subTitle = "Bezugsberechtigte Personen",
                    value = 30.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                beneficiaryCustomersWithChildren = StatisticsDetail(
                    title = "30",
                    subTitle = "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
                    value = 30.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                singleParentHouseholds = StatisticsDetail(
                    title = "30",
                    subTitle = "Alleinerzieher (Haushalte)",
                    value = 30.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                sheltersCount = StatisticsDetail(
                    title = "60",
                    subTitle = "Notschlafstellen (Anzahl)",
                    value = 60.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                sheltersAverage = StatisticsDetail(
                    title = "20,00",
                    subTitle = "Notschlafstellen (Durchschnitt pro Ausgabe)",
                    value = 20.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                sheltersPersonsCount = StatisticsDetail(
                    title = "60",
                    subTitle = "Versorgte Personen (Anzahl)",
                    value = 60.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                shopsCount = StatisticsDetail(
                    title = "60",
                    subTitle = "Spender (Anzahl)",
                    value = 60.0,
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                shopItemsTotal = StatisticsDetail(
                    title = "60 kg",
                    subTitle = "Warenmenge (Gesamt)",
                    value = 60.0,
                    unit = "kg",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
                shopItemsAverage = StatisticsDetail(
                    title = "20,00 kg",
                    subTitle = "Warenmenge (Durchschnitt pro Spender)",
                    value = 20.0,
                    unit = "kg",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints,
                ),
            ),
        )
    }

    @Test
    fun `generate csv`() {
        val fromDate = LocalDate.of(2024, 1, 1)
        val toDate = LocalDate.of(2024, 12, 31)

        val mockQuery = mockk<Query>(relaxed = true)
        every { entityManager.createNativeQuery(any<String>()) } returns mockQuery
        every { mockQuery.resultList } returns listOf(
            arrayOf<Any>("Jänner", 10L),
            arrayOf<Any>("Februar", 20L),
            arrayOf<Any>("März", 30L),
        )

        val result = service.generateCsv(fromDate, toDate)

        assertThat(result.filename).isEqualTo("statistik_export_01.01.2024_bis_31.12.2024.csv")

        val csvContent = String(result.bytes, Charsets.UTF_8)

        val lines = csvContent.trim().lines()
        assertThat(lines).hasSize(11)

        assertThat(lines[0]).isEqualTo("Statistik-Export;Zeitraum: 01.01.2024 bis 31.12.2024")
        assertThat(lines[1]).isEqualTo("Bezugsberechtigte Haushalte;30")
        assertThat(lines[2]).isEqualTo("Bezugsberechtigte Personen;30")
        assertThat(lines[3]).isEqualTo("Bezugsberechtigte Haushalte mit Kindern (Alter <= 15);30")
        assertThat(lines[4]).isEqualTo("Alleinerzieher (Haushalte);30")
        assertThat(lines[5]).isEqualTo("Notschlafstellen (Anzahl);60")
        assertThat(lines[6]).isEqualTo("Notschlafstellen (Durchschnitt pro Ausgabe);20,00")
        assertThat(lines[7]).isEqualTo("Notschlafstellen (versorgte Personen pro Ausgabe);60")
        assertThat(lines[8]).isEqualTo("Spender (Anzahl);60")
        assertThat(lines[9]).isEqualTo("Warenmenge (Gesamt);60 kg")
        assertThat(lines[10]).isEqualTo("Warenmenge (Durchschnitt pro Spender);20,00 kg")
    }

    /**
     * The age-range/main-person/valid-household *filtering* itself now happens inside the
     * Specification passed to `personRepository.findAll(...)` (see `StatisticsServiceIT` for that
     * behavior against a real DB) - these unit tests only cover what the service does with
     * whatever `PersonRepository` hands back: mapping to `ChildItem` and
     * translating `page` into a zero-based `PageRequest`.
     */
    private fun personEntity(householdId: Long, firstname: String, lastname: String, age: Int): PersonEntity {
        val household = HouseholdEntity(householdId = householdId, validUntil = LocalDate.now().plusYears(1))
        return PersonEntity(household = household, country = testCountry1).apply {
            this.firstname = firstname
            this.lastname = lastname
            this.birthDate = LocalDate.now().minusYears(age.toLong())
        }
    }

    @Test
    fun `generateChildrenCsv builds one row per person returned by the repository`() {
        every { personRepository.findAll(any<Specification<PersonEntity>>()) } returns listOf(
            personEntity(householdId = 5L, firstname = "A", lastname = "Household5", age = 7),
            personEntity(householdId = 20L, firstname = "B", lastname = "Household20", age = 8),
        )

        val csvContent = String(service.generateChildrenCsv(ageMin = 6, ageMax = 10).bytes, Charsets.UTF_8)

        assertThat(csvContent).contains("Haushalt;Vorname;Nachname;Alter")
        assertThat(csvContent).contains("5;A;Household5;7")
        assertThat(csvContent).contains("20;B;Household20;8")
    }

    @Test
    fun `generateChildrenCsv filename contains todays date`() {
        every { personRepository.findAll(any<Specification<PersonEntity>>()) } returns emptyList()

        val result = service.generateChildrenCsv(ageMin = 6, ageMax = 10)

        assertThat(result.filename).startsWith("auswertung_kinder_")
        assertThat(result.filename).endsWith(".csv")
    }

    @Test
    fun `getChildrenData maps the returned page content to entries`() {
        every {
            personRepository.findAll(any<Specification<PersonEntity>>(), any<Pageable>())
        } returns PageImpl(
            listOf(personEntity(householdId = 5L, firstname = "A", lastname = "Household5", age = 7)),
            PageRequest.of(0, 25),
            1,
        )

        val result = service.getChildrenData(ageMin = 6, ageMax = 10, page = 1)

        assertThat(result.items).containsExactly(
            ChildItem(householdId = 5L, firstname = "A", lastname = "Household5", age = 7),
        )
        assertThat(result.currentPage).isEqualTo(1)
        assertThat(result.totalPages).isEqualTo(1)
        assertThat(result.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `getChildrenData totalCount reflects the pages totalElements, not the items on the current page`() {
        // Page 1 of a 30-row result, 25 (a full page) returned here - PageImpl would otherwise
        // "correct" an inconsistent total (see its constructor) if offset + pageSize exceeded it,
        // so this has to stay a realistic full first page rather than an arbitrary short list.
        val fullPage = (1..25).map { personEntity(householdId = it.toLong(), firstname = "Kind", lastname = "Nr$it", age = 7) }
        every {
            personRepository.findAll(any<Specification<PersonEntity>>(), any<Pageable>())
        } returns PageImpl(fullPage, PageRequest.of(0, 25), 30)

        val result = service.getChildrenData(ageMin = 6, ageMax = 10, page = 1)

        assertThat(result.items).hasSize(25)
        assertThat(result.totalCount).isEqualTo(30L)
        assertThat(result.currentPage).isEqualTo(1)
    }

    @Test
    fun `getChildrenData translates the 1-based page param into a 0-based PageRequest`() {
        val pageableSlot = slot<Pageable>()
        every {
            personRepository.findAll(any<Specification<PersonEntity>>(), capture(pageableSlot))
        } returns PageImpl(emptyList(), PageRequest.of(1, 25), 0)

        service.getChildrenData(ageMin = 6, ageMax = 10, page = 2)

        assertThat(pageableSlot.captured.pageNumber).isEqualTo(1)
        assertThat(pageableSlot.captured.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `getChildrenData defaults to the first page`() {
        val pageableSlot = slot<Pageable>()
        every {
            personRepository.findAll(any<Specification<PersonEntity>>(), capture(pageableSlot))
        } returns PageImpl(emptyList(), PageRequest.of(0, 25), 0)

        val result = service.getChildrenData(ageMin = 6, ageMax = 10, page = null)

        assertThat(result.currentPage).isEqualTo(1)
        assertThat(pageableSlot.captured.pageNumber).isEqualTo(0)
    }

    @Test
    fun `getChildrenData with invalid pageSize falls back to default`() {
        val pageableSlot = slot<Pageable>()
        every {
            personRepository.findAll(any<Specification<PersonEntity>>(), capture(pageableSlot))
        } returns PageImpl(emptyList(), PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE), 0)

        service.getChildrenData(ageMin = 6, ageMax = 10, page = 1, pageSize = 999)

        assertThat(pageableSlot.captured.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `getChildrenData reports the age as of the given reference date`() {
        every {
            personRepository.findAll(any<Specification<PersonEntity>>(), any<Pageable>())
        } returns PageImpl(
            listOf(personEntity(householdId = 5L, firstname = "A", lastname = "Household5", age = 5)),
            PageRequest.of(0, 25),
            1,
        )

        val result = service.getChildrenData(
            ageMin = 6,
            ageMax = 10,
            referenceDate = LocalDate.now().plusYears(1),
        )

        assertThat(result.items.single().age).isEqualTo(6)
    }

    @Test
    fun `generateChildrenCsv reports the age as of the given reference date`() {
        every { personRepository.findAll(any<Specification<PersonEntity>>()) } returns listOf(
            personEntity(householdId = 5L, firstname = "A", lastname = "Household5", age = 5),
        )

        val csvContent = String(
            service.generateChildrenCsv(
                ageMin = 6,
                ageMax = 10,
                referenceDate = LocalDate.now().plusYears(1),
            ).bytes,
            Charsets.UTF_8,
        )

        assertThat(csvContent).contains("5;A;Household5;6")
    }

    @Test
    fun `getChildrenAgeDistribution reports every age of the range, empty ones included`() {
        val result = service.getChildrenAgeDistribution(ageMin = 6, ageMax = 8)

        assertThat(result.items).containsExactly(
            ChildAgeCountItem(age = 6, count = 0),
            ChildAgeCountItem(age = 7, count = 0),
            ChildAgeCountItem(age = 8, count = 0),
        )
    }

    @Test
    fun `children report rejects an inverted age range`() {
        assertThatThrownBy { service.getChildrenData(ageMin = 11, ageMax = 10) }
            .isInstanceOf(BusinessRuleException::class.java)
            .hasMessageContaining("'Alter von' darf nicht größer als 'Alter bis' sein!")

        assertThatThrownBy { service.getChildrenAgeDistribution(ageMin = 11, ageMax = 10) }
            .isInstanceOf(BusinessRuleException::class.java)

        assertThatThrownBy { service.generateChildrenCsv(ageMin = 11, ageMax = 10) }
            .isInstanceOf(BusinessRuleException::class.java)
    }

    @Test
    fun `children report rejects an age outside the supported bounds`() {
        assertThatThrownBy { service.getChildrenData(ageMin = -1, ageMax = 10) }
            .isInstanceOf(BusinessRuleException::class.java)
            .hasMessageContaining("Alter muss zwischen 0 und 120 Jahren liegen!")

        assertThatThrownBy { service.getChildrenData(ageMin = 6, ageMax = 121) }
            .isInstanceOf(BusinessRuleException::class.java)
            .hasMessageContaining("Alter muss zwischen 0 und 120 Jahren liegen!")
    }
}

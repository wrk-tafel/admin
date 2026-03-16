package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDetailData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import jakarta.persistence.EntityManager
import jakarta.persistence.Query
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class StatisticsServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var entityManager: EntityManager

    @InjectMockKs
    private lateinit var service: StatisticsService

    @Test
    fun `getSettings returns available years and distribution dates sorted descending`() {
        val distribution1 = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2023, 5, 15, 10, 0)
            endedAt = LocalDateTime.of(2023, 5, 15, 12, 0)
        }
        val distribution2 = DistributionEntity().apply {
            id = 2
            startedAt = LocalDateTime.of(2024, 3, 20, 9, 30)
            endedAt = LocalDateTime.of(2024, 3, 20, 11, 30)
        }
        val distribution3 = DistributionEntity().apply {
            id = 3
            startedAt = LocalDateTime.of(2024, 8, 10, 11, 0)
            endedAt = LocalDateTime.of(2024, 8, 10, 13, 0)
        }
        val distribution4 = DistributionEntity().apply {
            id = 4
            startedAt = LocalDateTime.of(2022, 12, 5, 14, 0)
            endedAt = LocalDateTime.of(2022, 12, 5, 16, 0)
        }

        every { distributionRepository.findAll() } returns listOf(
            distribution1,
            distribution2,
            distribution3,
            distribution4
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024, 2023, 2022)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 8, 10, 11, 0),
                endDate = LocalDateTime.of(2024, 8, 10, 13, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 3, 20, 9, 30),
                endDate = LocalDateTime.of(2024, 3, 20, 11, 30)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2023, 5, 15, 10, 0),
                endDate = LocalDateTime.of(2023, 5, 15, 12, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2022, 12, 5, 14, 0),
                endDate = LocalDateTime.of(2022, 12, 5, 16, 0)
            )
        )
    }

    @Test
    fun `getSettings handles empty distributions list`() {
        every { distributionRepository.findAll() } returns emptyList()

        val result = service.getSettings()

        assertThat(result.availableYears).isEmpty()
        assertThat(result.distributions).isEmpty()
    }

    @Test
    fun `getSettings filters out null startedAt values`() {
        val distribution1 = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2024, 5, 15, 10, 0)
            endedAt = LocalDateTime.of(2024, 5, 15, 12, 0)
        }
        val distribution2 = DistributionEntity().apply {
            id = 2
            startedAt = null
            endedAt = LocalDateTime.of(2024, 5, 15, 12, 0)
        }
        val distribution3 = DistributionEntity().apply {
            id = 3
            startedAt = LocalDateTime.of(2023, 3, 20, 9, 30)
            endedAt = LocalDateTime.of(2023, 3, 20, 11, 30)
        }

        every { distributionRepository.findAll() } returns listOf(
            distribution1,
            distribution2,
            distribution3
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024, 2023)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 5, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 5, 15, 12, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2023, 3, 20, 9, 30),
                endDate = LocalDateTime.of(2023, 3, 20, 11, 30)
            )
        )
    }

    @Test
    fun `getSettings returns distinct years when multiple distributions in same year`() {
        val distribution1 = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2024, 1, 15, 10, 0)
            endedAt = LocalDateTime.of(2024, 1, 15, 12, 0)
        }
        val distribution2 = DistributionEntity().apply {
            id = 2
            startedAt = LocalDateTime.of(2024, 5, 20, 9, 30)
            endedAt = LocalDateTime.of(2024, 5, 20, 11, 30)
        }
        val distribution3 = DistributionEntity().apply {
            id = 3
            startedAt = LocalDateTime.of(2024, 12, 10, 11, 0)
            endedAt = LocalDateTime.of(2024, 12, 10, 13, 0)
        }

        every { distributionRepository.findAll() } returns listOf(
            distribution1,
            distribution2,
            distribution3
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024)
        assertThat(result.distributions).hasSize(3)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 12, 10, 11, 0),
                endDate = LocalDateTime.of(2024, 12, 10, 13, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 5, 20, 9, 30),
                endDate = LocalDateTime.of(2024, 5, 20, 11, 30)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 1, 15, 12, 0)
            )
        )
    }

    @Test
    fun `getSettings sorts years in descending order`() {
        val distribution1 = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2020, 1, 1, 10, 0)
            endedAt = LocalDateTime.of(2020, 1, 1, 12, 0)
        }
        val distribution2 = DistributionEntity().apply {
            id = 2
            startedAt = LocalDateTime.of(2025, 1, 1, 10, 0)
            endedAt = LocalDateTime.of(2025, 1, 1, 12, 0)
        }
        val distribution3 = DistributionEntity().apply {
            id = 3
            startedAt = LocalDateTime.of(2022, 1, 1, 10, 0)
            endedAt = LocalDateTime.of(2022, 1, 1, 12, 0)
        }
        val distribution4 = DistributionEntity().apply {
            id = 4
            startedAt = LocalDateTime.of(2021, 1, 1, 10, 0)
            endedAt = LocalDateTime.of(2021, 1, 1, 12, 0)
        }

        every { distributionRepository.findAll() } returns listOf(
            distribution1,
            distribution2,
            distribution3,
            distribution4
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2025, 2022, 2021, 2020)
    }

    @Test
    fun `getSettings sorts distribution dates in descending order`() {
        val distribution1 = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2024, 1, 1, 8, 0)
            endedAt = LocalDateTime.of(2024, 1, 1, 10, 0)
        }
        val distribution2 = DistributionEntity().apply {
            id = 2
            startedAt = LocalDateTime.of(2024, 1, 1, 14, 0)
            endedAt = LocalDateTime.of(2024, 1, 1, 16, 0)
        }
        val distribution3 = DistributionEntity().apply {
            id = 3
            startedAt = LocalDateTime.of(2024, 1, 1, 11, 30)
            endedAt = LocalDateTime.of(2024, 1, 1, 13, 30)
        }

        every { distributionRepository.findAll() } returns listOf(
            distribution1,
            distribution2,
            distribution3
        )

        val result = service.getSettings()

        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 14, 0),
                endDate = LocalDateTime.of(2024, 1, 1, 16, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 11, 30),
                endDate = LocalDateTime.of(2024, 1, 1, 13, 30)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 8, 0),
                endDate = LocalDateTime.of(2024, 1, 1, 10, 0)
            )
        )
    }

    @Test
    fun `getSettings with single distribution`() {
        val distribution = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2024, 6, 15, 10, 0)
            endedAt = LocalDateTime.of(2024, 6, 15, 12, 0)
        }

        every { distributionRepository.findAll() } returns listOf(distribution)

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 6, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 6, 15, 12, 0)
            )
        )
    }

    @Test
    fun `getSettings with all null startedAt values`() {
        val distribution1 = DistributionEntity().apply {
            id = 1
            startedAt = null
            endedAt = LocalDateTime.of(2024, 6, 15, 12, 0)
        }
        val distribution2 = DistributionEntity().apply {
            id = 2
            startedAt = null
            endedAt = LocalDateTime.of(2024, 6, 16, 12, 0)
        }

        every { distributionRepository.findAll() } returns listOf(distribution1, distribution2)

        val result = service.getSettings()

        assertThat(result.availableYears).isEmpty()
        assertThat(result.distributions).isEmpty()
    }

    @Test
    fun `getSettings filters out open distributions without endedAt`() {
        val closedDistribution1 = DistributionEntity().apply {
            id = 1
            startedAt = LocalDateTime.of(2024, 5, 15, 10, 0)
            endedAt = LocalDateTime.of(2024, 5, 15, 12, 0)
        }
        val openDistribution = DistributionEntity().apply {
            id = 2
            startedAt = LocalDateTime.of(2024, 6, 20, 9, 30)
            endedAt = null
        }
        val closedDistribution2 = DistributionEntity().apply {
            id = 3
            startedAt = LocalDateTime.of(2023, 3, 10, 11, 0)
            endedAt = LocalDateTime.of(2023, 3, 10, 13, 0)
        }

        every { distributionRepository.findAll() } returns listOf(
            closedDistribution1,
            openDistribution,
            closedDistribution2
        )

        val result = service.getSettings()

        assertThat(result.availableYears).containsExactly(2024, 2023)
        assertThat(result.distributions).containsExactly(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 5, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 5, 15, 12, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2023, 3, 10, 11, 0),
                endDate = LocalDateTime.of(2023, 3, 10, 13, 0)
            )
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
            arrayOf<Any>("März", 30L)
        )

        val result = service.getData(fromDate, toDate)

        val expectedLabels = listOf("Jänner", "Februar", "März")
        val expectedDataPoints = listOf(10.0, 20.0, 30.0)

        assertThat(result).isEqualTo(
            StatisticsData(
                beneficiaryCustomers = StatisticsDetailData(
                    title = "30.0",
                    subTitle = "Bezugsberechtigte Haushalte",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints
                ),
                beneficiaryPersons = StatisticsDetailData(
                    title = "30.0",
                    subTitle = "Bezugsberechtigte Personen",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints
                ),
                beneficiaryCustomersWithChildren = StatisticsDetailData(
                    title = "30.0",
                    subTitle = "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints
                ),
                sheltersCount = StatisticsDetailData(
                    title = "30.0",
                    subTitle = "Notschlafstellen (Anzahl)",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints
                ),
                sheltersAverage = StatisticsDetailData(
                    title = "30.0",
                    subTitle = "Notschlafstellen (Durchschnitt pro Ausgabe)",
                    labels = expectedLabels,
                    dataPoints = expectedDataPoints
                ),
            )
        )
    }

}

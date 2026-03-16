package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsCsvResult
import at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
class StatisticsControllerTest {

    @RelaxedMockK
    private lateinit var service: StatisticsService

    @InjectMockKs
    private lateinit var controller: StatisticsController

    @Test
    fun `getSettings returns statistics settings from service`() {
        val expectedSettings = StatisticsSettings(
            availableYears = listOf(2024, 2023, 2022),
            distributions = listOf(
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
                )
            )
        )

        every { service.getSettings() } returns expectedSettings

        val result = controller.getSettings()

        assertThat(result).isEqualTo(expectedSettings)
        assertThat(result.availableYears).containsExactly(2024, 2023, 2022)
        assertThat(result.distributions).hasSize(3)
        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `getSettings returns empty lists when no distributions exist`() {
        val expectedSettings = StatisticsSettings(
            availableYears = emptyList(),
            distributions = emptyList()
        )

        every { service.getSettings() } returns expectedSettings

        val result = controller.getSettings()

        assertThat(result).isEqualTo(expectedSettings)
        assertThat(result.availableYears).isEmpty()
        assertThat(result.distributions).isEmpty()
        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `getSettings delegates to service`() {
        controller.getSettings()

        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `getSettings returns settings with single year`() {
        val expectedSettings = StatisticsSettings(
            availableYears = listOf(2024),
            distributions = listOf(
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2024, 6, 15, 10, 0),
                    endDate = LocalDateTime.of(2024, 6, 15, 12, 0)
                )
            )
        )

        every { service.getSettings() } returns expectedSettings

        val result = controller.getSettings()

        assertThat(result.availableYears).containsExactly(2024)
        assertThat(result.distributions).hasSize(1)
        assertThat(result.distributions[0]).isEqualTo(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 6, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 6, 15, 12, 0)
            )
        )
        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `getSettings returns settings with multiple years`() {
        val expectedSettings = StatisticsSettings(
            availableYears = listOf(2025, 2024, 2023, 2022, 2021),
            distributions = listOf(
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2025, 1, 15, 10, 0),
                    endDate = LocalDateTime.of(2025, 1, 15, 12, 0)
                ),
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2024, 12, 31, 23, 59),
                    endDate = LocalDateTime.of(2025, 1, 1, 1, 59)
                ),
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2024, 6, 15, 12, 0),
                    endDate = LocalDateTime.of(2024, 6, 15, 14, 0)
                ),
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2023, 8, 20, 9, 30),
                    endDate = LocalDateTime.of(2023, 8, 20, 11, 30)
                ),
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2022, 3, 10, 14, 15),
                    endDate = LocalDateTime.of(2022, 3, 10, 16, 15)
                ),
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2021, 11, 5, 10, 0),
                    endDate = LocalDateTime.of(2021, 11, 5, 12, 0)
                )
            )
        )

        every { service.getSettings() } returns expectedSettings

        val result = controller.getSettings()

        assertThat(result.availableYears).containsExactly(2025, 2024, 2023, 2022, 2021)
        assertThat(result.distributions).hasSize(6)
        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `getSettings preserves year ordering from service`() {
        val expectedSettings = StatisticsSettings(
            availableYears = listOf(2024, 2023, 2022),
            distributions = listOf(
                StatisticsDistribution(
                    startDate = LocalDateTime.of(2024, 8, 10, 11, 0),
                    endDate = LocalDateTime.of(2024, 8, 10, 13, 0)
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
        )

        every { service.getSettings() } returns expectedSettings

        val result = controller.getSettings()

        assertThat(result.availableYears).containsExactlyElementsOf(expectedSettings.availableYears)
        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `getSettings preserves distribution dates ordering from service`() {
        val expectedDistributions = listOf(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 12, 31, 23, 59),
                endDate = LocalDateTime.of(2025, 1, 1, 1, 59)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 6, 15, 12, 0),
                endDate = LocalDateTime.of(2024, 6, 15, 14, 0)
            ),
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 1, 1, 8, 0),
                endDate = LocalDateTime.of(2024, 1, 1, 10, 0)
            )
        )

        val expectedSettings = StatisticsSettings(
            availableYears = listOf(2024),
            distributions = expectedDistributions
        )

        every { service.getSettings() } returns expectedSettings

        val result = controller.getSettings()

        assertThat(result.distributions).containsExactlyElementsOf(expectedDistributions)
        verify(exactly = 1) { service.getSettings() }
    }

    @Test
    fun `get data`() {
        val fromDate = LocalDate.now().minusDays(2)
        val toDate = LocalDate.now()
        val expectedData = mockk<StatisticsData>()

        every { service.getData(fromDate, toDate) } returns expectedData

        val result = controller.getData(fromDate, toDate)

        assertThat(result).isEqualTo(expectedData)
        verify(exactly = 1) { service.getData(fromDate, toDate) }
    }

    @Test
    fun `generate csv - result mapped`() {
        val testFilename = "file.csv"
        every { service.generateCsv(any(), any()) } returns StatisticsCsvResult(
            filename = testFilename,
            bytes = testFilename.toByteArray()
        )

        val response = controller.generateCsv(
            fromDate = LocalDate.now().minusDays(2),
            toDate = LocalDate.now()
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo(MediaType.TEXT_PLAIN_VALUE)

        assertThat(
            response.headers.get(HttpHeaders.CONTENT_DISPOSITION)!!.first()
        ).isEqualTo("inline; filename=$testFilename")

        val bodyBytes = response.body?.inputStream?.readAllBytes()!!
        assertThat(String(bodyBytes)).isEqualTo(testFilename)
    }

}

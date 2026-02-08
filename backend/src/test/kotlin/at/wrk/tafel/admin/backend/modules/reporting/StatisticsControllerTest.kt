package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
class StatisticsControllerTest {

    @RelaxedMockK
    private lateinit var statisticsService: StatisticsService

    @InjectMockKs
    private lateinit var reportingController: ReportingController

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

        every { statisticsService.getSettings() } returns expectedSettings

        val result = reportingController.getSettings()

        assertThat(result).isEqualTo(expectedSettings)
        assertThat(result.availableYears).containsExactly(2024, 2023, 2022)
        assertThat(result.distributions).hasSize(3)
        verify(exactly = 1) { statisticsService.getSettings() }
    }

    @Test
    fun `getSettings returns empty lists when no distributions exist`() {
        val expectedSettings = StatisticsSettings(
            availableYears = emptyList(),
            distributions = emptyList()
        )

        every { statisticsService.getSettings() } returns expectedSettings

        val result = reportingController.getSettings()

        assertThat(result).isEqualTo(expectedSettings)
        assertThat(result.availableYears).isEmpty()
        assertThat(result.distributions).isEmpty()
        verify(exactly = 1) { statisticsService.getSettings() }
    }

    @Test
    fun `getSettings delegates to service`() {
        reportingController.getSettings()

        verify(exactly = 1) { statisticsService.getSettings() }
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

        every { statisticsService.getSettings() } returns expectedSettings

        val result = reportingController.getSettings()

        assertThat(result.availableYears).containsExactly(2024)
        assertThat(result.distributions).hasSize(1)
        assertThat(result.distributions[0]).isEqualTo(
            StatisticsDistribution(
                startDate = LocalDateTime.of(2024, 6, 15, 10, 0),
                endDate = LocalDateTime.of(2024, 6, 15, 12, 0)
            )
        )
        verify(exactly = 1) { statisticsService.getSettings() }
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

        every { statisticsService.getSettings() } returns expectedSettings

        val result = reportingController.getSettings()

        assertThat(result.availableYears).containsExactly(2025, 2024, 2023, 2022, 2021)
        assertThat(result.distributions).hasSize(6)
        verify(exactly = 1) { statisticsService.getSettings() }
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

        every { statisticsService.getSettings() } returns expectedSettings

        val result = reportingController.getSettings()

        assertThat(result.availableYears).containsExactlyElementsOf(expectedSettings.availableYears)
        verify(exactly = 1) { statisticsService.getSettings() }
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

        every { statisticsService.getSettings() } returns expectedSettings

        val result = reportingController.getSettings()

        assertThat(result.distributions).containsExactlyElementsOf(expectedDistributions)
        verify(exactly = 1) { statisticsService.getSettings() }
    }

}

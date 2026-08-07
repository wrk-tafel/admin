package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity4
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class CountryDistributionExporterTest {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Test
    fun `exported properly`() {
        val testStatisticDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
                testDistributionHouseholdEntity3,
                testDistributionHouseholdEntity4,
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution).apply {
            employeeCount = 100
        }
        testStatisticDistribution.statistic = testStatistic
        val exporter = CountryDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Nationalitaeten")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        LocalDateTime.now().format(DATE_FORMATTER)
                    } - Verteilung Nationalitäten",
                ),
                listOf("Nationalität", "Haushalte", "Prozent"),
                listOf("Österreich", "4", "44,44"),
                listOf("Deutschland", "2", "22,22"),
                listOf("Schweiz", "2", "22,22"),
                listOf("Frankreich", "1", "11,11"),
            ),
        )
    }

    @Test
    fun `exported properly without data`() {
        val testStatisticDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution).apply {
            employeeCount = 100
        }
        testStatisticDistribution.statistic = testStatistic
        val exporter = CountryDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Nationalitaeten")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        LocalDateTime.now().format(DATE_FORMATTER)
                    } - Verteilung Nationalitäten",
                ),
                listOf("Nationalität", "Haushalte", "Prozent"),
            ),
        )
    }
}

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
class HouseholdSizeDistributionExporterTest {

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
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen",
                ),
                listOf("Personen", "Haushalte", "Prozent"),
                listOf("1", "2", "50,00"),
                listOf("2", "0", "0,00"),
                listOf("3", "1", "25,00"),
                listOf("4", "1", "25,00"),
                listOf("5", "0", "0,00"),
                listOf("6", "0", "0,00"),
                listOf("7", "0", "0,00"),
                listOf("8", "0", "0,00"),
                listOf("9", "0", "0,00"),
                listOf("10", "0", "0,00"),
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
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen",
                ),
                listOf("Personen", "Haushalte", "Prozent"),
                listOf("1", "0", "0,00"),
                listOf("2", "0", "0,00"),
                listOf("3", "0", "0,00"),
                listOf("4", "0", "0,00"),
                listOf("5", "0", "0,00"),
                listOf("6", "0", "0,00"),
                listOf("7", "0", "0,00"),
                listOf("8", "0", "0,00"),
                listOf("9", "0", "0,00"),
                listOf("10", "0", "0,00"),
            ),
        )
    }
}

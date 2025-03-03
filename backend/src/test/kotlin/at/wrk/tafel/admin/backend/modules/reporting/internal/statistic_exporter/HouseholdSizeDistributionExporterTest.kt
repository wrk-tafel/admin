package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity3
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity4
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
        val testStatistic = DistributionStatisticEntity().apply {
            employeeCount = 100
        }
        testStatistic.distribution = DistributionEntity().apply {
            id = 123
            statistic = testStatistic
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2,
                testDistributionCustomerEntity3,
                testDistributionCustomerEntity4,
            )
        }
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen"
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
            )
        )
    }

    @Test
    fun `exported properly without data`() {
        val testStatistic = DistributionStatisticEntity().apply {
            employeeCount = 100
        }
        testStatistic.distribution = DistributionEntity().apply {
            id = 123
            statistic = testStatistic
        }
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen"
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
            )
        )
    }

}

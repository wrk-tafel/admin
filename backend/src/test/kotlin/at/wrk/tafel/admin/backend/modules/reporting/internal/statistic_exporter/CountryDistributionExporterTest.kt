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
class CountryDistributionExporterTest {

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
        val exporter = CountryDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Nationalitaeten")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        LocalDateTime.now().format(DATE_FORMATTER)
                    } - Verteilung Nationalitäten"
                ),
                listOf("Nationalität", "Haushalte", "Prozent"),
                listOf("Österreich", "4", "44,44"),
                listOf("Deutschland", "2", "22,22"),
                listOf("Schweiz", "2", "22,22"),
                listOf("Frankreich", "1", "11,11"),
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
        val exporter = CountryDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Nationalitaeten")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        LocalDateTime.now().format(DATE_FORMATTER)
                    } - Verteilung Nationalitäten"
                ),
                listOf("Nationalität", "Haushalte", "Prozent"),
            )
        )
    }

}

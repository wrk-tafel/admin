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
class AgeDistributionExporterTest {

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
        val exporter = AgeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Alter")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Altersverteilung"),
                listOf("Gruppe", "Haushalte", "Prozent", "Personen", "Personen/Haushalt"),
                listOf("0-20", "0", "0,00", "1", "0"),
                listOf("21-30", "1", "25,00", "3", "3"),
                listOf("31-40", "0", "0,00", "1", "0"),
                listOf("41-50", "0", "0,00", "0", "0"),
                listOf("51-60", "1", "25,00", "2", "2"),
                listOf("61-70", "0", "0,00", "1", "0"),
                listOf("71-80", "0", "0,00", "1", "0"),
                listOf("81-90", "2", "50,00", "4", "2"),
                listOf("91+", "0", "0,00", "0", "0"),
                listOf("gesamt", "4", "100,00", "9", "2"),
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

        val exporter = AgeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Alter")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Altersverteilung"),
                listOf("Gruppe", "Haushalte", "Prozent", "Personen", "Personen/Haushalt"),
                listOf("0-20", "0", "0,00", "0", "0"),
                listOf("21-30", "0", "0,00", "0", "0"),
                listOf("31-40", "0", "0,00", "0", "0"),
                listOf("41-50", "0", "0,00", "0", "0"),
                listOf("51-60", "0", "0,00", "0", "0"),
                listOf("61-70", "0", "0,00", "0", "0"),
                listOf("71-80", "0", "0,00", "0", "0"),
                listOf("81-90", "0", "0,00", "0", "0"),
                listOf("91+", "0", "0,00", "0", "0"),
                listOf("gesamt", "0", "100,00", "0", "0"),
            )
        )
    }

}

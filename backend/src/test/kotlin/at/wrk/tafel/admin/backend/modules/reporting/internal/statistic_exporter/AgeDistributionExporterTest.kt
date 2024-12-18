package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity3
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionCustomerEntity4
import io.mockk.every
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class AgeDistributionExporterTest {

    @Test
    fun `exported properly`() {
        val statistic = mockk<DistributionStatisticEntity>()
        every { statistic.distribution } returns DistributionEntity().apply {
            id = 123
            employeeCount = 100
            personsInShelterCount = 200
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

        val rows = exporter.getRows(statistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TÖT Auswertung Stand: ${DateTimeFormatter.ofPattern("dd.MM.yyyy").format(LocalDateTime.now())} - Altersverteilung"),
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

}

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
class HouseholdSizeDistributionExporterTest {

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
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(statistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TÖT Auswertung Stand: ${
                        DateTimeFormatter.ofPattern("dd.MM.yyyy").format(LocalDateTime.now())
                    } - Haushaltsgrößen"
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

}

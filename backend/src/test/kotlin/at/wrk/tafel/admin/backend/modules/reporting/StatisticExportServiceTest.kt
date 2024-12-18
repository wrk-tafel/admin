package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter.StatisticExporter
import io.mockk.every
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verifySequence
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class StatisticExportServiceTest {

    @Test
    fun `exporter called properly`() {
        val statistic = mockk<DistributionStatisticEntity>()

        val exporter1 = mockk<StatisticExporter>()
        every { exporter1.getName() } returns "test1"
        every { exporter1.getRows(statistic) } returns emptyList()

        val exporter2 = mockk<StatisticExporter>()
        every { exporter2.getName() } returns "test2"
        every { exporter2.getRows(statistic) } returns emptyList()

        val service = StatisticExportService(
            statisticExporter = listOf(exporter1, exporter2)
        )

        val statisticZipFile = service.exportStatisticZipFile(statistic)

        assertThat(statisticZipFile.filename).isEqualTo("statistik.zip")
        assertThat(statisticZipFile.content.size).isGreaterThan(0)

        verifySequence {
            exporter1.getName()
            exporter1.getRows(statistic)

            exporter2.getName()
            exporter2.getRows(statistic)
        }
    }

}

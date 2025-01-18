package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class FoodCollectionsExporterTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var foodCategoryRepository: FoodCategoryRepository

    @InjectMockKs
    private lateinit var exporter: FoodCollectionsExporter

    @Test
    fun `exported properly`() {
        every { foodCategoryRepository.findAll() } returns listOf(testFoodCategory1, testFoodCategory2)

        val statistic = mockk<DistributionStatisticEntity>()
        val distribution1 = DistributionEntity().apply {
            id = 111
            startedAt = LocalDateTime.now()
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                testFoodCollectionRoute2Entity,
                testFoodCollectionRoute3Entity,
            )
        }
        val distribution2 = DistributionEntity().apply {
            id = 222
            startedAt = LocalDateTime.now().minusDays(7)
            foodCollections = listOf(
                testFoodCollectionRoute2Entity
            )
        }

        every { distributionRepository.getDistributionsForYear(LocalDateTime.now().year) } returns listOf(
            distribution1,
            distribution2
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Spenden")

        val rows = exporter.getRows(statistic)

        val dateTimeFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(dateTimeFormatter)} - Spenden"),
                listOf("Datum", "Route", "Spender", "Category 1", "Category 2"),
                listOf(distribution2.startedAt!!.format(dateTimeFormatter), "-", "3", "0", "5"),
                listOf(distribution1.startedAt!!.format(dateTimeFormatter), "-", "3", "0", "5"),
                listOf(distribution1.startedAt!!.format(dateTimeFormatter), "1.0", "1", "0", "0"),
                listOf(distribution1.startedAt!!.format(dateTimeFormatter), "1.0", "2", "2", "4"),
            )
        )
    }

    @Test
    fun `exported properly without data`() {
        every { foodCategoryRepository.findAll() } returns listOf(testFoodCategory1, testFoodCategory2)

        val statistic = mockk<DistributionStatisticEntity>()
        every { distributionRepository.getDistributionsForYear(LocalDateTime.now().year) } returns listOf(
            DistributionEntity().apply {
                id = 123
                startedAt = LocalDateTime.now()
            }
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Spenden")

        val rows = exporter.getRows(statistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        DateTimeFormatter.ofPattern("dd.MM.yyyy").format(LocalDateTime.now())
                    } - Spenden"
                ),
                listOf("Datum", "Route", "Spender", "Category 1", "Category 2"),
            )
        )
    }

}

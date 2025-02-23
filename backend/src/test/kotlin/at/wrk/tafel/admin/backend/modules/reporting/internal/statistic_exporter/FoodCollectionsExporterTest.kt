package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory3
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
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

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Test
    fun `exported properly`() {
        every { foodCategoryRepository.findAll() } returns listOf(
            testFoodCategory3,
            testFoodCategory2,
            testFoodCategory1
        )

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

        val currentDistribution = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
            foodCollections = listOf(
                testFoodCollectionRoute2Entity
            )
        }
        val currentStatistic = DistributionStatisticEntity().apply {
            distribution = currentDistribution
        }

        every { distributionRepository.getDistributionsForYear(LocalDateTime.now().year) } returns listOf(
            distribution1,
            distribution2
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Spenden")

        val rows = exporter.getRows(currentStatistic)

        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden (in kg)"),
                listOf("Datum", "Route", "Spender", "Category 1", "Category 3", "Category 2"),
                listOf(distribution2.startedAt!!.format(DATE_FORMATTER), "2.0", "3", "0", "0", "5"),
                listOf(distribution1.startedAt!!.format(DATE_FORMATTER), "1.0", "1", "0", "0", "0"),
                listOf(distribution1.startedAt!!.format(DATE_FORMATTER), "1.0", "2", "20", "0", "80"),
                listOf(distribution1.startedAt!!.format(DATE_FORMATTER), "2.0", "3", "0", "0", "5"),
                listOf(currentDistribution.startedAt!!.format(DATE_FORMATTER), "2.0", "3", "0", "0", "5"),
            )
        )
    }

    @Test
    fun `exported properly without previous data`() {
        every { foodCategoryRepository.findAll() } returns listOf(
            testFoodCategory3,
            testFoodCategory2,
            testFoodCategory1
        )

        val currentDistribution = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
        }
        val currentStatistic = DistributionStatisticEntity().apply {
            distribution = currentDistribution
        }
        every { distributionRepository.getDistributionsForYear(LocalDateTime.now().year) } returns listOf(
            currentDistribution
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Spenden")

        val rows = exporter.getRows(currentStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden (in kg)"
                ),
                listOf("Datum", "Route", "Spender", "Category 1", "Category 3", "Category 2"),
            )
        )
    }

}

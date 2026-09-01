package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory3
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute4Entity
import at.wrk.tafel.admin.backend.security.testUserEntity
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
            testFoodCategory1,
        )

        val distribution1 = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 111
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                testFoodCollectionRoute2Entity,
                testFoodCollectionRoute3Entity,
            )
        }
        val distribution2 = DistributionEntity(startedAt = LocalDateTime.now().minusDays(7), startedByUser = testUserEntity).apply {
            id = 222
            foodCollections = listOf(
                testFoodCollectionRoute2Entity,
            )
        }

        // Deliberately later than distribution1's plain `now()` rather than another bare `now()`:
        // two distributions created within the same test method can otherwise land microseconds
        // apart, making the expected row order flaky depending on real-clock precision rather than
        // on the sorting this test actually verifies.
        val currentDistribution = DistributionEntity(startedAt = LocalDateTime.now().plusHours(1), startedByUser = testUserEntity).apply {
            id = 123
            foodCollections = listOf(
                testFoodCollectionRoute2Entity,
            )
        }
        val currentStatistic = DistributionStatisticEntity(distribution = currentDistribution)
        currentDistribution.statistic = currentStatistic

        // the repository returns every distribution of the year including the one currently being
        // exported - the exporter has to filter that one out itself, not rely on the repository mock
        every { distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year) } returns listOf(
            distribution1,
            distribution2,
            currentDistribution,
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Spenden")

        val rows = exporter.getRows(currentStatistic)

        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden (in kg)"),
                listOf("Datum", "Route", "Spender", "Category 1", "Category 2", "Category 3"),
                listOf(distribution2.startedAt!!.format(DATE_FORMATTER), "Route 2", "3", "0", "0", "5"),
                listOf(distribution1.startedAt!!.format(DATE_FORMATTER), "Route 1", "1", "0", "0", "0"),
                listOf(distribution1.startedAt!!.format(DATE_FORMATTER), "Route 1", "2", "20", "0", "120"),
                listOf(distribution1.startedAt!!.format(DATE_FORMATTER), "Route 2", "3", "0", "0", "5"),
                listOf(currentDistribution.startedAt!!.format(DATE_FORMATTER), "Route 2", "3", "0", "0", "5"),
            ),
        )
    }

    @Test
    fun `exported properly without previous data`() {
        every { foodCategoryRepository.findAll() } returns listOf(
            testFoodCategory3,
            testFoodCategory2,
            testFoodCategory1,
        )

        val currentDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val currentStatistic = DistributionStatisticEntity(distribution = currentDistribution)
        currentDistribution.statistic = currentStatistic
        every { distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year) } returns listOf(
            currentDistribution,
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Spenden")

        val rows = exporter.getRows(currentStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden (in kg)",
                ),
                listOf("Datum", "Route", "Spender", "Category 1", "Category 2", "Category 3"),
            ),
        )
    }

    /**
     * A manual resend can target an older, already-ended distribution while a newer one exists
     * (e.g. after it) - its rows must land in their chronological position, not always last, see
     * issue #3599.
     */
    @Test
    fun `current distribution's rows land in chronological order, not always last`() {
        every { foodCategoryRepository.findAll() } returns listOf(testFoodCategory1)

        // both single shop/single item routes, so each distribution contributes exactly one row -
        // keeps the assertion below about row order rather than about food-collection fan-out
        val laterDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 111
            foodCollections = listOf(testFoodCollectionRoute2Entity)
        }

        val currentDistribution = DistributionEntity(startedAt = LocalDateTime.now().minusDays(1), startedByUser = testUserEntity).apply {
            id = 123
            foodCollections = listOf(testFoodCollectionRoute4Entity)
        }
        val currentStatistic = DistributionStatisticEntity(distribution = currentDistribution)
        currentDistribution.statistic = currentStatistic

        every { distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year) } returns listOf(
            laterDistribution,
            currentDistribution,
        )

        val rows = exporter.getRows(currentStatistic)

        assertThat(rows.drop(2).map { it[0] }).containsExactly(
            currentDistribution.startedAt!!.format(DATE_FORMATTER),
            laterDistribution.startedAt!!.format(DATE_FORMATTER),
        )
    }

    @Test
    fun `renaming a route, shop or category afterwards does not change already recorded rows`() {
        val category = FoodCategoryEntity(name = "Original Category", sortOrder = 0, enabled = true).apply { id = 501 }
        val shop = ShopEntity(
            number = 9,
            name = "Original Shop",
            address = ShopAddress(street = "Street", postalCode = 1111, city = "City"),
        ).apply { id = 501 }
        val route = RouteEntity(number = 9.0, name = "Original Route").apply { id = 501 }

        every { foodCategoryRepository.findAll() } returns listOf(category)

        val pastDistribution = DistributionEntity(startedAt = LocalDateTime.now().minusDays(1), startedByUser = testUserEntity).apply {
            id = 501
        }
        val foodCollection = FoodCollectionEntity(distribution = pastDistribution, route = route).apply {
            items = listOf(FoodCollectionItemEntity(category = category, shop = shop, amount = 1))
        }
        pastDistribution.foodCollections = listOf(foodCollection)

        val currentDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 502
        }
        val currentStatistic = DistributionStatisticEntity(distribution = currentDistribution)
        currentDistribution.statistic = currentStatistic

        every { distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year) } returns listOf(pastDistribution)

        // rename everything in the live master data after the collection was already recorded
        category.name = "Renamed Category"
        shop.number = 99
        route.name = "Renamed Route"

        val rows = exporter.getRows(currentStatistic)

        assertThat(rows[1]).isEqualTo(listOf("Datum", "Route", "Spender", "Original Category"))
        assertThat(rows[2]).isEqualTo(
            listOf(pastDistribution.startedAt!!.format(DATE_FORMATTER), "Original Route", "9", "0"),
        )
    }
}

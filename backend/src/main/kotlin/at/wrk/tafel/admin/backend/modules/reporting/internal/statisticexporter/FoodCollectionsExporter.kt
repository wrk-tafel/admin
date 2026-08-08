package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.text.NumberFormat
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Component
class FoodCollectionsExporter(
    private val distributionRepository: DistributionRepository,
    private val foodCategoryRepository: FoodCategoryRepository,
) : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val NUMBER_FORMATTER = NumberFormat.getNumberInstance()
    }

    override fun getName(): String = "TOeT_Spenden"

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val descriptionHeaderRow =
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden (in kg)")

        // `food_categories` holds only weighed donation categories now - return boxes are counted
        // by free-text description on the food collection itself and live in their own table, so
        // they never show up in this donation weight export
        val sortedFoodCategories = foodCategoryRepository.findAll().sortedBy { it.name }
        val columnsHeaderRow = generateHeaderFromCategories(sortedFoodCategories)

        val distributions = distributionRepository.getDistributionsForYear(LocalDateTime.now().year)
            .sortedBy { it.startedAt }

        val previousRows = distributions.flatMap { distribution ->
            calculateFoodCollections(sortedFoodCategories, distribution)
        }
        val currentRows = calculateFoodCollections(sortedFoodCategories, currentStatistic.distribution)

        return listOf(descriptionHeaderRow, columnsHeaderRow) + previousRows + currentRows
    }

    private fun generateHeaderFromCategories(sortedFoodCategories: List<FoodCategoryEntity>): List<String> = listOf("Datum", "Route", "Spender") + sortedFoodCategories.map { it.name }

    private fun calculateFoodCollections(
        sortedFoodCategories: List<FoodCategoryEntity>,
        distribution: DistributionEntity,
    ): List<List<String>> {
        val rows = mutableListOf<List<String>>()

        val foodCollections = distribution.foodCollections.sortedBy { it.route.number }
        foodCollections.forEach { foodCollection ->
            val items = foodCollection.items
            if (!items.isNullOrEmpty()) {
                val shops = items.map { it.shop }
                    .sortedBy { it.number }
                    .distinctBy { it.id }

                shops.forEach { currentShop ->
                    val columns = mutableListOf<String>()
                    columns.add(distribution.startedAt.format(DATE_FORMATTER))
                    columns.add(foodCollection.route.name)
                    columns.add(currentShop.number.toString())

                    sortedFoodCategories.forEach { foodCategory ->
                        val itemPerCategory =
                            items.firstOrNull { it.category.id == foodCategory.id && it.shop.id == currentShop.id }
                        val weight = itemPerCategory?.weight ?: BigDecimal.ZERO
                        columns.add(NUMBER_FORMATTER.format(weight))
                    }

                    rows.add(columns)
                }
            }
        }

        return rows
    }
}

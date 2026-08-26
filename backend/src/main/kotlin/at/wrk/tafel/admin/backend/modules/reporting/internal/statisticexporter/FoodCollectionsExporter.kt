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

        val distributions = distributionRepository.getDistributionsForYear(LocalDateTime.now().year)
            .sortedBy { it.startedAt }
        val currentDistribution = currentStatistic.distribution

        // `food_categories` holds only weighed donation categories now - return boxes are counted
        // by free-text description on the food collection itself and live in their own table, so
        // they never show up in this donation weight export
        val sortedCategories = sortedCategoriesWithDisplayName(distributions + currentDistribution)
        val columnsHeaderRow = generateHeaderFromCategories(sortedCategories)

        val previousRows = distributions.flatMap { distribution ->
            calculateFoodCollections(sortedCategories, distribution)
        }
        val currentRows = calculateFoodCollections(sortedCategories, currentDistribution)

        return listOf(descriptionHeaderRow, columnsHeaderRow) + previousRows + currentRows
    }

    /**
     * A food category's `name` is editable master data, so reading it live would retroactively
     * rewrite this column's header for distributions that already happened whenever a category gets
     * renamed. The displayed name therefore prefers the [FoodCollectionItemEntity.categoryName]
     * actually recorded for the exported distributions (the most recent one, if it changed across
     * them) and falls back to the category's current name only for one that was never recorded in
     * this period - so it still gets a (zero-filled) column, same as before.
     */
    private fun sortedCategoriesWithDisplayName(
        distributions: List<DistributionEntity>,
    ): List<Pair<FoodCategoryEntity, String>> {
        val recordedNamesById = distributions
            .flatMap { it.foodCollections }
            .flatMap { it.items ?: emptyList() }
            .associate { it.category.id to it.categoryName }

        return foodCategoryRepository.findAll()
            .map { category -> category to (recordedNamesById[category.id] ?: category.name) }
            .sortedBy { (_, name) -> name }
    }

    private fun generateHeaderFromCategories(sortedCategories: List<Pair<FoodCategoryEntity, String>>): List<String> = listOf("Datum", "Route", "Spender") + sortedCategories.map { it.second }

    private fun calculateFoodCollections(
        sortedCategories: List<Pair<FoodCategoryEntity, String>>,
        distribution: DistributionEntity,
    ): List<List<String>> {
        val rows = mutableListOf<List<String>>()

        val foodCollections = distribution.foodCollections.sortedBy { it.route.number }
        foodCollections.forEach { foodCollection ->
            val items = foodCollection.items
            if (!items.isNullOrEmpty()) {
                val shopIds = items.map { it.shop.id }
                    .distinct()
                    .sortedBy { shopId -> items.first { it.shop.id == shopId }.shopNumber }

                shopIds.forEach { shopId ->
                    val itemsForShop = items.filter { it.shop.id == shopId }

                    val columns = mutableListOf<String>()
                    columns.add(distribution.startedAt.format(DATE_FORMATTER))
                    columns.add(foodCollection.routeName)
                    columns.add(itemsForShop.first().shopNumber.toString())

                    sortedCategories.forEach { (category, _) ->
                        val itemPerCategory = itemsForShop.firstOrNull { it.category.id == category.id }
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

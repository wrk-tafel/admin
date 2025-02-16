package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Component
class FoodCollectionsExporter(
    private val distributionRepository: DistributionRepository,
    private val foodCategoryRepository: FoodCategoryRepository
) : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String {
        return "TOeT_Spenden"
    }

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val descriptionHeaderRow =
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden")

        val sortedFoodCategories = foodCategoryRepository.findAll().sortedBy { it.name }
        val columnsHeaderRow = generateHeaderFromCategories(sortedFoodCategories)

        val distributions = distributionRepository.getDistributionsForYear(LocalDateTime.now().year)
            .sortedBy { it.startedAt }

        val previousRows = distributions.flatMap { distribution ->
            calculateFoodCollections(sortedFoodCategories, distribution)
        }
        val currentRows = calculateFoodCollections(sortedFoodCategories, currentStatistic.distribution!!)

        return listOf(descriptionHeaderRow, columnsHeaderRow) + previousRows + currentRows
    }

    private fun generateHeaderFromCategories(sortedFoodCategories: List<FoodCategoryEntity>): List<String> {
        val fixedHeaders = listOf("Datum", "Route", "Spender")
        val categoryHeaders = sortedFoodCategories.mapNotNull { it.name }.sorted()
        return fixedHeaders + categoryHeaders
    }

    private fun calculateFoodCollections(
        sortedFoodCategories: List<FoodCategoryEntity>,
        distribution: DistributionEntity
    ): List<List<String>> {
        val rows = mutableListOf<List<String>>()

        val foodCollections = distribution.foodCollections.sortedBy { it.route!!.number }
        foodCollections.forEach { foodCollection ->
            val items = foodCollection.items
            if (!items.isNullOrEmpty()) {
                val shops = items.mapNotNull { it.shop }
                    .sortedBy { it.number }
                    .distinctBy { it.id }

                shops.forEach { shop ->
                    val columns = mutableListOf<String>()
                    columns.add(distribution.startedAt!!.format(DATE_FORMATTER))
                    columns.add(foodCollection.route!!.number!!.toString())
                    columns.add(shop.number.toString())

                    sortedFoodCategories.forEach { category ->
                        val itemPerCategory =
                            items.firstOrNull { it.category!!.id == category.id && it.shop!!.id == shop.id }
                        if (itemPerCategory != null) {
                            columns.add(itemPerCategory.amount?.toString() ?: "0")
                        } else {
                            columns.add("0")
                        }
                    }

                    rows.add(columns)
                }
            }
        }

        return rows
    }

}

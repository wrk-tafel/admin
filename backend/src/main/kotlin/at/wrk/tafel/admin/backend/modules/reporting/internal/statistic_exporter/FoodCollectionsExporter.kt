package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

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
import java.util.*

@Component
class FoodCollectionsExporter(
    private val distributionRepository: DistributionRepository,
    private val foodCategoryRepository: FoodCategoryRepository,
) : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val NUMBER_FORMATTER = NumberFormat.getNumberInstance(Locale.GERMANY)
    }

    override fun getName(): String {
        return "TOeT_Spenden"
    }

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val descriptionHeaderRow =
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Spenden (in kg)")

        val sortedFoodCategories = foodCategoryRepository.findAll()
            .sortedWith(
                compareBy<FoodCategoryEntity> { it.returnItem ?: false }
                    .thenBy { it.name }
            )
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
        return listOf("Datum", "Route", "Spender") + sortedFoodCategories.mapNotNull { it.name }
    }

    private fun calculateFoodCollections(
        sortedFoodCategories: List<FoodCategoryEntity>,
        distribution: DistributionEntity,
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
                        val weight = itemPerCategory?.calculateWeight() ?: BigDecimal.ZERO
                        columns.add(NUMBER_FORMATTER.format(weight))
                    }

                    rows.add(columns)
                }
            }
        }

        return rows
    }

}

package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Component
class HouseholdSizeDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String = "TOeT_Verteilung_Haushaltsgroesse"

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen"),
            listOf("Personen", "Haushalte", "Prozent"),
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val referenceDate = statistic.distribution.startedAt.toLocalDate()
        val households = statistic.distribution.households.map { it.household }
        val householdsCount = households.size

        val rows = mutableListOf<List<String>>()
        (1..10).forEach { personSize ->
            val personCountPerSize = households.count { getPersonCount(it, referenceDate) == personSize }
            val percentage =
                if (householdsCount > 0) (personCountPerSize.toDouble() / householdsCount) * 100 else 0

            rows.add(listOf(personSize.toString(), personCountPerSize.toString(), String.format("%.2f", percentage.toFloat())))
        }

        // households larger than the explicit 1..10 rows above still have to be counted somewhere,
        // otherwise this column's percentages no longer add up to the household total
        val largeHouseholdsCount = households.count { getPersonCount(it, referenceDate) > 10 }
        val largeHouseholdsPercentage =
            if (householdsCount > 0) (largeHouseholdsCount.toDouble() / householdsCount) * 100 else 0
        rows.add(listOf("11+", largeHouseholdsCount.toString(), String.format("%.2f", largeHouseholdsPercentage.toFloat())))

        return rows
    }

    private fun getPersonCount(household: HouseholdEntity, referenceDate: LocalDate): Int = household.additionalPersonsAsOf(referenceDate).size + 1
}

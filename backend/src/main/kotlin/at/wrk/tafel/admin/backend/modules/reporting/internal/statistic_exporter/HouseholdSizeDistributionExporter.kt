package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Component
class HouseholdSizeDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String {
        return "TOeT_Verteilung_Haushaltsgroesse"
    }

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen"),
            listOf("Personen", "Haushalte", "Prozent")
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val households = statistic.distribution?.households?.mapNotNull { it.household } ?: emptyList()
        val householdsCount = households.size

        val rows = mutableListOf<List<String>>()
        (1..10).forEach { personSize ->
            val personCountPerSize = households.count { getPersonCount(it) == personSize }
            val percentage =
                if (householdsCount > 0) (personCountPerSize.toDouble() / householdsCount) * 100 else 0

            rows.add(listOf(personSize.toString(), personCountPerSize.toString(), String.format("%.2f", percentage.toFloat())))
        }

        return rows
    }

    private fun getPersonCount(household: HouseholdEntity): Int {
        return household.additionalPersons().size + 1
    }

}

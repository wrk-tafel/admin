package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*

@Component
class CountryDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String {
        return "TOeT_Verteilung_Nationalitaeten"
    }

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Verteilung Nationalitäten"),
            listOf("Nationalität", "Haushalte", "Prozent")
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        val customers = statistic.distribution?.customers?.mapNotNull { it.customer } ?: emptyList()
        val countries =
            customers.map { it.country } + customers.flatMap { it.additionalPersons }.mapNotNull { it.country }
        val countCountriesTotal = countries.size

        val countedByCountry = countries
            .groupingBy { it }
            .fold(0) { count, _ -> count + 1 }
            .entries
            .sortedByDescending { it.value }
            .associate { it.toPair() }

        countedByCountry.forEach {
            val countPerCountry = it.value
            val percentage =
                if (countCountriesTotal > 0) (countPerCountry.toDouble() / countCountriesTotal) * 100 else 0

            rows.add(listOf(it.key!!.name.toString(), countPerCountry.toString(), String.format(Locale.GERMAN, "%.2f", percentage)))
        }

        return rows
    }

}

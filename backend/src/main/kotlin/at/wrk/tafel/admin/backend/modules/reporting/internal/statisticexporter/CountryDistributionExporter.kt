package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Component
class CountryDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String = "TOeT_Verteilung_Nationalitaeten"

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Verteilung Nationalitäten"),
            listOf("Nationalität", "Haushalte", "Prozent"),
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        val households = statistic.distribution.households.map { it.household }
        val countries = households.map { household ->
            (household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson })?.country
        } + households.flatMap { it.additionalPersons() }.mapNotNull { it.country }
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

            rows.add(listOf(it.key!!.name, countPerCountry.toString(), String.format("%.2f", percentage)))
        }

        return rows
    }
}

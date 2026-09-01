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
            listOf("Nationalität", "Prozent", "Haushalte", "Personen"),
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    /**
     * `Haushalte`/`Prozent` count and rank by household - one entry per household, by its main
     * person's country - same as [AgeDistributionExporter]'s `Haushalte` column; `Personen` is the
     * separate, always-larger person-level count (every household member, not just the main person)
     * - see issue #3599, where a single merged count labeled `Haushalte` was actually counting
     * persons.
     */
    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        val referenceDate = statistic.distribution.startedAt.toLocalDate()
        val households = statistic.distribution.households.map { it.household }

        val householdCountries = households.map { household ->
            (household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson })?.country
        }
        val personCountries = householdCountries + households.flatMap { it.additionalPersonsAsOf(referenceDate) }.map { it.country }
        val countHouseholdsTotal = households.size

        val householdCountByCountry = householdCountries.filterNotNull().groupingBy { it }.eachCount()
        val personCountByCountry = personCountries.filterNotNull().groupingBy { it }.eachCount()

        val sortedCountries = (householdCountByCountry.keys + personCountByCountry.keys)
            .distinct()
            .sortedByDescending { householdCountByCountry[it] ?: 0 }

        sortedCountries.forEach { country ->
            val countHouseholdsPerCountry = householdCountByCountry[country] ?: 0
            val countPersonsPerCountry = personCountByCountry[country] ?: 0
            val percentage =
                if (countHouseholdsTotal > 0) (countHouseholdsPerCountry.toDouble() / countHouseholdsTotal) * 100 else 0

            rows.add(
                listOf(
                    country.name,
                    String.format("%.2f", percentage),
                    countHouseholdsPerCountry.toString(),
                    countPersonsPerCountry.toString(),
                ),
            )
        }

        return rows
    }
}

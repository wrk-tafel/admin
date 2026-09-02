package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.IsoFields

@Component
class DailyReportsExporter(
    private val distributionRepository: DistributionRepository,
) : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String = "TOeT_Tagesreports"

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val descriptionHeaderRow =
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Tagesreports")
        val columnsHeaderRow = listOf(
            "Datum",
            "KW",
            "Versorgte Personen",
            "davon in NOST",
            "davon in Ausgabestelle",
            "davon Kinder < 3 Jahre",
            "Haushalte",
            "Verlängert (Haushalte)",
            "Verlängert (Personen)",
            "Neue Kunden",
            "Neue Personen",
            "Alleinerzieher (Haushalte)",
            "Ges. Spender",
            "Spender mit Ware",
            "Warenmenge",
            "Kilometerleistung",
            "Anz. MitarbeiterInnen",
        )

        val currentDistribution = currentStatistic.distribution
        val otherDistributions = distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year)
            .filter { it.id != currentDistribution.id }

        // Merged and sorted together rather than "every other distribution, then the current one
        // appended last": the current distribution being exported isn't necessarily the year's most
        // recent one (a manual resend can target an older, already-ended distribution while a newer
        // one is open), so appending it unconditionally would put its row out of chronological order.
        val rows = (otherDistributions + currentDistribution)
            .sortedBy { it.startedAt }
            .mapNotNull { distribution ->
                if (distribution.id == currentDistribution.id) {
                    generateStatisticColumns(distribution, currentStatistic)
                } else {
                    distribution.statistic?.let { generateStatisticColumns(distribution, it) }
                }
            }

        return listOf(descriptionHeaderRow, columnsHeaderRow) + rows
    }

    private fun generateStatisticColumns(
        distribution: DistributionEntity,
        statistic: DistributionStatisticEntity,
    ): List<String> {
        val columns = mutableListOf<String>()

        val startedAt = distribution.startedAt
        columns.add(startedAt.format(DATE_FORMATTER))
        columns.add(startedAt[IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString())

        val countPersonsInShelter = statistic.shelters.sumOf { it.personsCount }
        val countPeopleTotal = statistic.countPersons.plus(countPersonsInShelter)
        columns.add(countPeopleTotal.toString())
        columns.add(countPersonsInShelter.toString())

        columns.add(statistic.countPersons.toString())
        columns.add(statistic.countInfants.toString())
        columns.add(statistic.countCustomers.toString())
        columns.add(statistic.countCustomersProlonged.toString())
        columns.add(statistic.countPersonsProlonged.toString())
        columns.add(statistic.countCustomersNew.toString())
        columns.add(statistic.countPersonsNew.toString())
        columns.add(statistic.countSingleParentHouseholds.toString())
        columns.add(statistic.shopsTotalCount.toString())
        columns.add(statistic.shopsWithFoodCount.toString())
        columns.add(statistic.foodTotalAmount.toString())
        columns.add(statistic.routesLengthKm.toString())
        columns.add(statistic.employeeCount.toString())

        return columns
    }
}

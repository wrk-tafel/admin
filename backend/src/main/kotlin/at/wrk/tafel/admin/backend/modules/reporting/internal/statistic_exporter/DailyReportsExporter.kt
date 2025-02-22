package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

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

    override fun getName(): String {
        return "TOeT_Tages-Reports"
    }

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val descriptionHeaderRow =
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Tages-Reports")
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
            "Ges. Spender",
            "Spender mit Ware",
            "Warenmenge",
            "Kilometerleistung",
            "Anz. MitarbeiterInnen"
        )

        val previousDistributions = distributionRepository.getDistributionsForYear(LocalDateTime.now().year)
            .sortedBy { it.startedAt }

        val previousRows = previousDistributions.mapNotNull { distribution ->
            val distributionStatistic = distribution.statistic
            if (distributionStatistic != null) {
                generateStatisticColumns(distribution, distributionStatistic)
            } else {
                null
            }
        }
        val currentRows = generateStatisticColumns(currentStatistic.distribution!!, currentStatistic)

        val result = mutableListOf(descriptionHeaderRow, columnsHeaderRow)
        if (previousRows.isNotEmpty()) {
            result += previousRows
        }
        result += currentRows
        return result
    }

    private fun generateStatisticColumns(
        distribution: DistributionEntity, statistic: DistributionStatisticEntity,
    ): List<String> {
        val columns = mutableListOf<String>()

        val startedAt = distribution.startedAt!!
        columns.add(startedAt.format(DATE_FORMATTER))
        columns.add(startedAt[IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString())

        val countPersonsInShelter = statistic.shelters.sumOf { it.personsCount ?: 0 }
        val countPeopleTotal = statistic.countCustomers
            .plus(statistic.countPersons)
            .plus(countPersonsInShelter)
        columns.add(countPeopleTotal.toString())
        columns.add(countPersonsInShelter.toString())

        val countCustomerPersonsTotal = statistic.countCustomers.plus(statistic.countPersons)
        columns.add(countCustomerPersonsTotal.toString())
        columns.add(statistic.countInfants.toString())
        columns.add(statistic.countCustomers.toString())
        columns.add(statistic.countCustomersProlonged.toString())
        columns.add(statistic.countPersonsProlonged.toString())
        columns.add(statistic.countCustomersNew.toString())
        columns.add(statistic.countPersonsNew.toString())
        columns.add(statistic.shopsTotalCount.toString())
        columns.add(statistic.shopsWithFoodCount.toString())
        columns.add(statistic.foodTotalAmount.toString())
        columns.add(statistic.routesLengthKm.toString())
        columns.add(statistic.employeeCount.toString())

        return columns
    }

}

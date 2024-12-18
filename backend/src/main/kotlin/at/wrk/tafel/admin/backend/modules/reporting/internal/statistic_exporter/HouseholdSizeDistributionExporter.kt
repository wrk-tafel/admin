package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*

@Component
class HouseholdSizeDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String {
        return "TOeT_Verteilung_Haushaltsgroesse"
    }

    override fun getRows(statistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TÖT Auswertung Stand: ${DATE_FORMATTER.format(LocalDateTime.now())} - Haushaltsgrößen"),
            listOf("Personen", "Haushalte", "Prozent")
        )
        val dataRows = calculateDistribution(statistic)

        return headerRows + dataRows
    }

    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val customers = statistic.distribution?.customers?.mapNotNull { it.customer } ?: emptyList()
        val customersCount = customers.size

        val rows = mutableListOf<List<String>>()
        (1..10).forEach { personSize ->
            val personCountPerSize = customers.count { getPersonCount(it) == personSize }
            val percentage =
                if (customersCount > 0) (personCountPerSize.toDouble() / customersCount) * 100 else 0

            rows.add(listOf(personSize.toString(), personCountPerSize.toString(), String.format(Locale.GERMAN,"%.2f", percentage)))
        }

        return rows
    }

    private fun getPersonCount(customer: CustomerEntity): Int {
        return customer.additionalPersons.size + 1
    }

}

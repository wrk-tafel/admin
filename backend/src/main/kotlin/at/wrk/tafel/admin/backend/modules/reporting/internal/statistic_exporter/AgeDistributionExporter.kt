package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.*

@Component
class AgeDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String {
        return "TOeT_Verteilung_Alter"
    }

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Altersverteilung"),
            listOf("Gruppe", "Haushalte", "Prozent", "Personen", "Personen/Haushalt")
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        val customers = statistic.distribution
            ?.customers
            ?.mapNotNull { it.customer }
            ?: emptyList()
        val persons = customers.flatMap { it.additionalPersons }
        val customersBirthDates = customers.map { it.birthDate }
        val personsBirthDates = persons.map { it.birthDate } + customersBirthDates

        val countCustomers = customers.size
        val countPersons = countCustomers + persons.size
        val averagePersonsPerHousehold = if (countCustomers > 0) countPersons / countCustomers else 0

        val groupedCustomers = countByAgeRange(customersBirthDates)
        val groupedPersons = countByAgeRange(personsBirthDates + customersBirthDates)

        val rows = mutableListOf<List<String>>()
        AgeRange.entries.forEach { ageRange ->
            val countCustomersPerRange = groupedCustomers[ageRange] ?: 0
            val percentageCustomersPerRange =
                if (countCustomers > 0) (countCustomersPerRange.toDouble() / countCustomers) * 100 else 0
            val countPersonsPerRange = groupedPersons[ageRange] ?: 0
            val averagePersonsPerHousehold =
                if (countCustomersPerRange > 0) countPersonsPerRange / countCustomersPerRange else 0

            rows.add(
                listOf(
                    ageRange.rangeName,
                    countCustomersPerRange.toString(),
                    String.format(Locale.GERMAN,"%.2f", percentageCustomersPerRange.toFloat()),
                    countPersonsPerRange.toString(),
                    averagePersonsPerHousehold.toString(),
                )
            )
        }

        val sumRow = listOf(
            "gesamt",
            countCustomers.toString(),
            "100,00",
            countPersons.toString(),
            averagePersonsPerHousehold.toString()
        )
        rows.add(sumRow)
        return rows
    }

    private fun countByAgeRange(birthDates: List<LocalDate?>) = birthDates
        .map { birthDate ->
            val age = ChronoUnit.YEARS.between(birthDate, LocalDateTime.now()).toInt()
            AgeRange.fromAge(age)
        }
        .groupingBy { it }
        .fold(0) { count, _ -> count + 1 }
}

enum class AgeRange(val rangeName: String, val minAge: Int, val maxAge: Int?) {
    RANGE_0_20("0-20", 0, 20),
    RANGE_21_30("21-30", 21, 30),
    RANGE_31_40("31-40", 31, 40),
    RANGE_41_50("41-50", 41, 50),
    RANGE_51_60("51-60", 51, 60),
    RANGE_61_70("61-70", 61, 70),
    RANGE_71_80("71-80", 71, 80),
    RANGE_81_90("81-90", 81, 90),
    RANGE_91_PLUS("91+", 91, null);

    companion object {
        fun fromAge(age: Int): AgeRange {
            return entries.find { age in it.minAge..(it.maxAge ?: Int.MAX_VALUE) }
                ?: throw IllegalArgumentException("Invalid age: $age")
        }
    }
}

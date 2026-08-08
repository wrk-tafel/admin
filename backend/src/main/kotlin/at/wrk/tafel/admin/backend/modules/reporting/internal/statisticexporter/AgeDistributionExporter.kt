package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@Component
class AgeDistributionExporter : StatisticExporter {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun getName(): String = "TOeT_Verteilung_Alter"

    override fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>> {
        val headerRows = listOf(
            listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Altersverteilung"),
            listOf("Gruppe", "Haushalte", "Prozent", "Personen", "Personen/Haushalt"),
        )
        val dataRows = calculateDistribution(currentStatistic)

        return headerRows + dataRows
    }

    /**
     * `household.additionalPersons()` deliberately excludes the household's own main person, so
     * `householdsBirthDates` (the main persons) has to be derived separately and spliced back into
     * `personsBirthDates` to get correct *person*-level age buckets - while the *household*-level
     * buckets (`groupedCustomers`) use `householdsBirthDates` alone. The same list is reused once
     * on its own and once merged; that's intentional, not redundant.
     */
    private fun calculateDistribution(statistic: DistributionStatisticEntity): List<List<String>> {
        // ages are bucketed as of the distribution's own day, not as of today, so re-exporting a past
        // distribution reproduces the buckets it had back then instead of shifting everyone forward
        val referenceDate = statistic.distribution.startedAt.toLocalDate()
        val households = statistic.distribution.households.map { it.household }
        val persons = households.flatMap { it.additionalPersons() }
        val householdsBirthDates = households.map { household ->
            (household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson })?.birthDate
        }
        val personsBirthDates = persons.map { it.birthDate } + householdsBirthDates

        val countCustomers = households.size
        val countPersons = countCustomers + persons.size
        val averagePersonsPerHousehold = if (countCustomers > 0) countPersons / countCustomers else 0

        val groupedCustomers = countByAgeRange(householdsBirthDates, referenceDate)
        val groupedPersons = countByAgeRange(personsBirthDates + householdsBirthDates, referenceDate)

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
                    String.format("%.2f", percentageCustomersPerRange.toFloat()),
                    countPersonsPerRange.toString(),
                    averagePersonsPerHousehold.toString(),
                ),
            )
        }

        val sumRow = listOf(
            "gesamt",
            countCustomers.toString(),
            "100,00",
            countPersons.toString(),
            averagePersonsPerHousehold.toString(),
        )
        rows.add(sumRow)
        return rows
    }

    private fun countByAgeRange(birthDates: List<LocalDate?>, referenceDate: LocalDate) = birthDates
        .map { birthDate ->
            val age = ChronoUnit.YEARS.between(birthDate, referenceDate).toInt()
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
    RANGE_91_PLUS("91+", 91, null),
    ;

    companion object {
        fun fromAge(age: Int): AgeRange = entries.find { age in it.minAge..(it.maxAge ?: Int.MAX_VALUE) }
            ?: throw IllegalArgumentException("Invalid age: $age")
    }
}

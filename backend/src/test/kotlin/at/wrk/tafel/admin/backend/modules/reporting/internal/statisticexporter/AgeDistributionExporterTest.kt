package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity4
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
class AgeDistributionExporterTest {

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Test
    fun `exported properly`() {
        val testStatisticDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
                testDistributionHouseholdEntity3,
                testDistributionHouseholdEntity4,
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution).apply {
            employeeCount = 100
        }
        testStatisticDistribution.statistic = testStatistic
        val exporter = AgeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Alter")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Altersverteilung"),
                listOf("Gruppe", "Haushalte", "Prozent", "Personen", "Personen/Haushalt"),
                listOf("0-20", "0", "0,00", "1", "0"),
                listOf("21-30", "1", "25,00", "2", "2"),
                listOf("31-40", "0", "0,00", "1", "0"),
                listOf("41-50", "0", "0,00", "0", "0"),
                listOf("51-60", "1", "25,00", "1", "1"),
                listOf("61-70", "0", "0,00", "1", "0"),
                listOf("71-80", "0", "0,00", "1", "0"),
                listOf("81-90", "2", "50,00", "2", "1"),
                listOf("91+", "0", "0,00", "0", "0"),
                listOf("gesamt", "4", "100,00", "9", "2"),
            ),
        )
    }

    /**
     * Each main person belongs in exactly one person bucket. Counting them once per household *and*
     * once per person would inflate every bucket a main person falls into, leaving a CSV whose
     * `Personen` column contradicts the `gesamt` row printed directly underneath it.
     */
    @Test
    fun `the household and person columns each add up to the gesamt row`() {
        val testStatisticDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
                testDistributionHouseholdEntity3,
                testDistributionHouseholdEntity4,
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution)
        testStatisticDistribution.statistic = testStatistic

        val rows = AgeDistributionExporter().getRows(testStatistic)

        val ageRangeRows = rows.filter { row -> AgeRange.entries.any { it.rangeName == row[0] } }
        val sumRow = rows.first { it[0] == "gesamt" }

        assertThat(ageRangeRows).hasSize(AgeRange.entries.size)
        assertThat(ageRangeRows.sumOf { it[1].toInt() }).isEqualTo(sumRow[1].toInt())
        assertThat(ageRangeRows.sumOf { it[3].toInt() }).isEqualTo(sumRow[3].toInt())
    }

    @Test
    fun `ages are bucketed as of the distribution date, not as of today`() {
        val startedAt = LocalDateTime.now().minusYears(10)
        val household = HouseholdEntity(householdId = 900, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            // 25 years old on the day of the distribution, 35 years old today
            birthDate = startedAt.toLocalDate().minusYears(25)
        }
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson

        val testStatisticDistribution = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                DistributionHouseholdEntity(distribution = this, household = household, ticketNumber = 1),
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution)
        testStatisticDistribution.statistic = testStatistic

        val rows = AgeDistributionExporter().getRows(testStatistic)

        assertThat(rows.first { it[0] == "21-30" }[1]).isEqualTo("1")
        assertThat(rows.first { it[0] == "31-40" }[1]).isEqualTo("0")
    }

    /**
     * A household is read as it is today, so re-exporting an old distribution sees the people added
     * to it since - a child born after that day has a negative age on it, which has no age range.
     */
    @Test
    fun `persons born after the distribution are left out`() {
        val startedAt = LocalDateTime.now().minusYears(10)
        val household = HouseholdEntity(householdId = 900, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            birthDate = startedAt.toLocalDate().minusYears(25)
        }
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson
        household.persons.add(
            PersonEntity(household = household, country = testCountry1).apply {
                birthDate = startedAt.toLocalDate().minusYears(5)
            },
        )
        household.persons.add(
            // born two years after that distribution, i.e. not a member of the household back then
            PersonEntity(household = household, country = testCountry1).apply {
                birthDate = startedAt.toLocalDate().plusYears(2)
            },
        )

        val testStatistic = statisticOf(startedAt, household)

        val rows = AgeDistributionExporter().getRows(testStatistic)

        assertThat(rows.first { it[0] == "0-20" }[3]).isEqualTo("1")
        assertThat(rows.first { it[0] == "21-30" }[3]).isEqualTo("1")
        assertThat(rows.first { it[0] == "gesamt" }).isEqualTo(listOf("gesamt", "1", "100,00", "2", "2"))
    }

    /**
     * Only main persons can reach the buckets without an age - the additional persons are already
     * filtered by the reference date - so the household stays counted and just lands in no range.
     */
    @Test
    fun `a main person without a birth date does not end up in an age range`() {
        val startedAt = LocalDateTime.now().minusYears(10)
        val household = HouseholdEntity(householdId = 900, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true)
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson

        val testStatistic = statisticOf(startedAt, household)

        val rows = AgeDistributionExporter().getRows(testStatistic)

        val ageRangeRows = rows.filter { row -> AgeRange.entries.any { it.rangeName == row[0] } }
        assertThat(ageRangeRows.sumOf { it[1].toInt() }).isZero()
        assertThat(rows.first { it[0] == "gesamt" }).isEqualTo(listOf("gesamt", "1", "100,00", "1", "1"))
    }

    private fun statisticOf(startedAt: LocalDateTime, household: HouseholdEntity): DistributionStatisticEntity {
        val distribution = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                DistributionHouseholdEntity(distribution = this, household = household, ticketNumber = 1),
            )
        }
        return DistributionStatisticEntity(distribution = distribution).also { distribution.statistic = it }
    }

    @Test
    fun `exported properly without data`() {
        val testStatisticDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution).apply {
            employeeCount = 100
        }
        testStatisticDistribution.statistic = testStatistic

        val exporter = AgeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Alter")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Altersverteilung"),
                listOf("Gruppe", "Haushalte", "Prozent", "Personen", "Personen/Haushalt"),
                listOf("0-20", "0", "0,00", "0", "0"),
                listOf("21-30", "0", "0,00", "0", "0"),
                listOf("31-40", "0", "0,00", "0", "0"),
                listOf("41-50", "0", "0,00", "0", "0"),
                listOf("51-60", "0", "0,00", "0", "0"),
                listOf("61-70", "0", "0,00", "0", "0"),
                listOf("71-80", "0", "0,00", "0", "0"),
                listOf("81-90", "0", "0,00", "0", "0"),
                listOf("91+", "0", "0,00", "0", "0"),
                listOf("gesamt", "0", "100,00", "0", "0"),
            ),
        )
    }
}

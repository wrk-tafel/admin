package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.country.testCountry2
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
class CountryDistributionExporterTest {

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
        val exporter = CountryDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Nationalitaeten")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        LocalDateTime.now().format(DATE_FORMATTER)
                    } - Verteilung Nationalitäten",
                ),
                listOf("Nationalität", "Prozent", "Haushalte", "Personen"),
                // Haushalte/Prozent count by household (its main person's country) - Österreich has
                // 2 of the 4 households (testHousehold1, testHousehold3); Personen counts every
                // household member instead, so Deutschland's 2 persons (testHousehold1's additional
                // person + testHousehold4's main person) outnumber its single household, and Schweiz
                // has a person (testHousehold4's additional person) without ever being a household's
                // main person's country at all - see issue #3599.
                listOf("Österreich", "50,00", "2", "2"),
                listOf("Frankreich", "25,00", "1", "1"),
                listOf("Deutschland", "25,00", "1", "2"),
                listOf("Schweiz", "0,00", "0", "1"),
            ),
        )
    }

    /**
     * A household is read as it is today - somebody born after the distribution was not part of it
     * on that day, so their nationality does not belong in that distribution's export either.
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
            PersonEntity(household = household, country = testCountry2).apply {
                birthDate = startedAt.toLocalDate().plusYears(2)
            },
        )

        val testStatisticDistribution = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                DistributionHouseholdEntity(distribution = this, household = household, ticketNumber = 1),
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution)
        testStatisticDistribution.statistic = testStatistic

        val rows = CountryDistributionExporter().getRows(testStatistic)

        assertThat(rows.drop(2)).isEqualTo(
            listOf(
                listOf(testCountry1.name, "100,00", "1", "1"),
            ),
        )
    }

    @Test
    fun `persons excluded from the household are left out`() {
        val startedAt = LocalDateTime.now()
        val household = HouseholdEntity(householdId = 901, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            birthDate = startedAt.toLocalDate().minusYears(25)
        }
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson
        household.persons.add(
            PersonEntity(household = household, country = testCountry2).apply {
                birthDate = startedAt.toLocalDate().minusYears(20)
                excludeFromHousehold = true
            },
        )

        val testStatisticDistribution = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                DistributionHouseholdEntity(distribution = this, household = household, ticketNumber = 1),
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution)
        testStatisticDistribution.statistic = testStatistic

        val rows = CountryDistributionExporter().getRows(testStatistic)

        assertThat(rows.drop(2)).isEqualTo(
            listOf(
                listOf(testCountry1.name, "100,00", "1", "1"),
            ),
        )
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
        val exporter = CountryDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Nationalitaeten")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${
                        LocalDateTime.now().format(DATE_FORMATTER)
                    } - Verteilung Nationalitäten",
                ),
                listOf("Nationalität", "Prozent", "Haushalte", "Personen"),
            ),
        )
    }
}

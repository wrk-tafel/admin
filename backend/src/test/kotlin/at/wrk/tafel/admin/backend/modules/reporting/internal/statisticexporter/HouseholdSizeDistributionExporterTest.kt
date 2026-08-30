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
class HouseholdSizeDistributionExporterTest {

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
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen",
                ),
                listOf("Personen", "Haushalte", "Prozent"),
                listOf("1", "2", "50,00"),
                listOf("2", "2", "50,00"),
                listOf("3", "0", "0,00"),
                listOf("4", "0", "0,00"),
                listOf("5", "0", "0,00"),
                listOf("6", "0", "0,00"),
                listOf("7", "0", "0,00"),
                listOf("8", "0", "0,00"),
                listOf("9", "0", "0,00"),
                listOf("10", "0", "0,00"),
                listOf("11+", "0", "0,00"),
            ),
        )
    }

    /**
     * A household is read as it is today, so the household that has grown since a past distribution
     * must still be sized by the members it had on that day.
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
            PersonEntity(household = household, country = testCountry1).apply {
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

        val rows = HouseholdSizeDistributionExporter().getRows(testStatistic)

        assertThat(rows.first { it[0] == "2" }[1]).isEqualTo("1")
        assertThat(rows.first { it[0] == "3" }[1]).isEqualTo("0")
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
            PersonEntity(household = household, country = testCountry1).apply {
                birthDate = startedAt.toLocalDate().minusYears(5)
            },
        )
        household.persons.add(
            PersonEntity(household = household, country = testCountry1).apply {
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

        val rows = HouseholdSizeDistributionExporter().getRows(testStatistic)

        assertThat(rows.first { it[0] == "2" }[1]).isEqualTo("1")
        assertThat(rows.first { it[0] == "3" }[1]).isEqualTo("0")
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
        val exporter = HouseholdSizeDistributionExporter()

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Verteilung_Haushaltsgroesse")

        val rows = exporter.getRows(testStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf(
                    "TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Haushaltsgrößen",
                ),
                listOf("Personen", "Haushalte", "Prozent"),
                listOf("1", "0", "0,00"),
                listOf("2", "0", "0,00"),
                listOf("3", "0", "0,00"),
                listOf("4", "0", "0,00"),
                listOf("5", "0", "0,00"),
                listOf("6", "0", "0,00"),
                listOf("7", "0", "0,00"),
                listOf("8", "0", "0,00"),
                listOf("9", "0", "0,00"),
                listOf("10", "0", "0,00"),
                listOf("11+", "0", "0,00"),
            ),
        )
    }

    @Test
    fun `households larger than 10 persons are counted in an overflow row instead of dropped`() {
        val startedAt = LocalDateTime.now()
        val household = HouseholdEntity(householdId = 902, validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            birthDate = startedAt.toLocalDate().minusYears(40)
        }
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson
        repeat(11) {
            household.persons.add(
                PersonEntity(household = household, country = testCountry1).apply {
                    birthDate = startedAt.toLocalDate().minusYears(10)
                },
            )
        }

        val testStatisticDistribution = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 123
            households = listOf(
                DistributionHouseholdEntity(distribution = this, household = household, ticketNumber = 1),
            )
        }
        val testStatistic = DistributionStatisticEntity(distribution = testStatisticDistribution)
        testStatisticDistribution.statistic = testStatistic

        val rows = HouseholdSizeDistributionExporter().getRows(testStatistic)

        assertThat(rows.first { it[0] == "10" }).isEqualTo(listOf("10", "0", "0,00"))
        assertThat(rows.first { it[0] == "11+" }).isEqualTo(listOf("11+", "1", "100,00"))
    }
}

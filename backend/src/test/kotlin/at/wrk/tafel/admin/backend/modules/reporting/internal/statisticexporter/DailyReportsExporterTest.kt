package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity1
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.IsoFields

@ExtendWith(MockKExtension::class)
class DailyReportsExporterTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @InjectMockKs
    private lateinit var exporter: DailyReportsExporter

    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    @Test
    fun `exported properly`() {
        val currentDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val currentStatistic = DistributionStatisticEntity(distribution = currentDistribution).apply {
            countPersons = 12
            countInfants = 11
            countCustomers = 10
            countCustomersProlonged = 9
            countPersonsProlonged = 8
            countCustomersNew = 7
            countPersonsNew = 6
            shopsTotalCount = 5
            shopsWithFoodCount = 4
            foodTotalAmount = BigDecimal("3.1")
            routesLengthKm = 2
            employeeCount = 1
        }

        val previousDistribution1 = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 111
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                testFoodCollectionRoute2Entity,
                testFoodCollectionRoute3Entity,
            )
        }
        previousDistribution1.statistic = DistributionStatisticEntity(distribution = previousDistribution1).apply {
            countPersons = 2
            countInfants = 3
            countCustomers = 4
            countCustomersProlonged = 5
            countPersonsProlonged = 6
            countCustomersNew = 7
            countPersonsNew = 8
            shopsTotalCount = 9
            shopsWithFoodCount = 10
            foodTotalAmount = BigDecimal("11.1")
            routesLengthKm = 12
            employeeCount = 13
            shelters = listOf(
                testDistributionStatisticShelterEntity1,
                testDistributionStatisticShelterEntity2,
            ).toMutableList()
        }
        val previousDistribution2 = DistributionEntity(startedAt = LocalDateTime.now().minusDays(7), startedByUser = testUserEntity).apply {
            id = 222
            foodCollections = listOf(
                testFoodCollectionRoute2Entity,
            )
        }
        previousDistribution2.statistic = DistributionStatisticEntity(distribution = previousDistribution2).apply {
            countPersons = 12
            countInfants = 11
            countCustomers = 10
            countCustomersProlonged = 9
            countPersonsProlonged = 8
            countCustomersNew = 7
            countPersonsNew = 6
            shopsTotalCount = 5
            shopsWithFoodCount = 4
            foodTotalAmount = BigDecimal("3.1")
            routesLengthKm = 2
            employeeCount = 1
            shelters = listOf(
                testDistributionStatisticShelterEntity1,
                testDistributionStatisticShelterEntity2,
            ).toMutableList()
        }

        currentDistribution.statistic = currentStatistic

        // the repository returns every distribution of the year including the one currently being
        // closed - the exporter has to filter that one out itself, not rely on the repository mock
        every { distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year) } returns listOf(
            previousDistribution1,
            previousDistribution2,
            currentDistribution,
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Tagesreports")

        val rows = exporter.getRows(currentStatistic)

        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Tagesreports"),
                listOf(
                    "Datum", "KW", "Versorgte Personen", "davon in NOST", "davon in Ausgabestelle", "davon Kinder < 3 Jahre", "Haushalte",
                    "Verlängert (Haushalte)", "Verlängert (Personen)", "Neue Kunden", "Neue Personen", "Alleinerzieher (Haushalte)", "Ges. Spender", "Spender mit Ware",
                    "Warenmenge", "Kilometerleistung", "Anz. MitarbeiterInnen",
                ),
                listOf(
                    previousDistribution2.startedAt!!.format(DATE_FORMATTER),
                    previousDistribution2.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "25", "3", "22", "11", "10", "9", "8", "7", "6", "0", "5", "4", "3.1", "2", "1",
                ),
                listOf(
                    previousDistribution1.startedAt!!.format(DATE_FORMATTER),
                    previousDistribution1.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "9", "3", "6", "3", "4", "5", "6", "7", "8", "0", "9", "10", "11.1", "12", "13",
                ),
                listOf(
                    currentDistribution.startedAt!!.format(DATE_FORMATTER),
                    currentDistribution.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "22", "0", "22", "11", "10", "9", "8", "7", "6", "0", "5", "4", "3.1", "2", "1",
                ),
            ),
        )
    }

    @Test
    fun `exported properly without previous data`() {
        val currentDistribution = DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity).apply {
            id = 123
        }
        val currentStatistic = DistributionStatisticEntity(distribution = currentDistribution).apply {
            countPersons = 12
            countInfants = 11
            countCustomers = 10
            countCustomersProlonged = 9
            countPersonsProlonged = 8
            countCustomersNew = 7
            countPersonsNew = 6
            shopsTotalCount = 5
            shopsWithFoodCount = 4
            foodTotalAmount = BigDecimal("3.1")
            routesLengthKm = 2
            employeeCount = 1

            shelters = listOf(
                testDistributionStatisticShelterEntity1,
                testDistributionStatisticShelterEntity2,
            ).toMutableList()
        }
        currentDistribution.statistic = currentStatistic
        every { distributionRepository.getDistributionsForYear(currentDistribution.startedAt.year) } returns listOf(
            currentDistribution,
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Tagesreports")

        val rows = exporter.getRows(currentStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Tagesreports"),
                listOf(
                    "Datum", "KW", "Versorgte Personen", "davon in NOST", "davon in Ausgabestelle", "davon Kinder < 3 Jahre", "Haushalte",
                    "Verlängert (Haushalte)", "Verlängert (Personen)", "Neue Kunden", "Neue Personen", "Alleinerzieher (Haushalte)", "Ges. Spender", "Spender mit Ware",
                    "Warenmenge", "Kilometerleistung", "Anz. MitarbeiterInnen",
                ),
                listOf(
                    currentDistribution.startedAt!!.format(DATE_FORMATTER),
                    currentDistribution.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "25", "3", "22", "11", "10", "9", "8", "7", "6", "0", "5", "4", "3.1", "2", "1",
                ),
            ),
        )
    }
}

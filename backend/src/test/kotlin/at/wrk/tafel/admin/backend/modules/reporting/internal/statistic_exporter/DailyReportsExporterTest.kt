package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity1
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity2
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
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
        val currentDistribution = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
        }
        val currentStatistic = DistributionStatisticEntity().apply {
            distribution = currentDistribution
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

        val previousDistribution1 = DistributionEntity().apply {
            id = 111
            startedAt = LocalDateTime.now()
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                testFoodCollectionRoute2Entity,
                testFoodCollectionRoute3Entity,
            )
            statistic = DistributionStatisticEntity().apply {
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
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }
        val previousDistribution2 = DistributionEntity().apply {
            id = 222
            startedAt = LocalDateTime.now().minusDays(7)
            foodCollections = listOf(
                testFoodCollectionRoute2Entity
            )
            statistic = DistributionStatisticEntity().apply {
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
                    testDistributionStatisticShelterEntity2
                ).toMutableList()
            }
        }

        every { distributionRepository.getDistributionsForYear(LocalDateTime.now().year) } returns listOf(
            previousDistribution1,
            previousDistribution2
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Tagesreports")

        val rows = exporter.getRows(currentStatistic)

        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Tagesreports"),
                listOf(
                    "Datum", "KW", "Versorgte Personen", "davon in NOST", "davon in Ausgabestelle", "davon Kinder < 3 Jahre", "Haushalte",
                    "Verlängert (Haushalte)", "Verlängert (Personen)", "Neue Kunden", "Neue Personen", "Ges. Spender", "Spender mit Ware",
                    "Warenmenge", "Kilometerleistung", "Anz. MitarbeiterInnen"
                ),
                listOf(
                    previousDistribution2.startedAt!!.format(DATE_FORMATTER),
                    previousDistribution2.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "25", "3", "22", "11", "10", "9", "8", "7", "6", "5", "4", "3.1", "2", "1"
                ),
                listOf(
                    previousDistribution1.startedAt!!.format(DATE_FORMATTER),
                    previousDistribution1.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "9", "3", "6", "3", "4", "5", "6", "7", "8", "9", "10", "11.1", "12", "13",
                ),
                listOf(
                    currentDistribution.startedAt!!.format(DATE_FORMATTER),
                    currentDistribution.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "22", "0", "22", "11", "10", "9", "8", "7", "6", "5", "4", "3.1", "2", "1",
                ),
            )
        )
    }

    @Test
    fun `exported properly without previous data`() {
        val currentDistribution = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now()
        }
        val currentStatistic = DistributionStatisticEntity().apply {
            distribution = currentDistribution
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
                testDistributionStatisticShelterEntity2
            ).toMutableList()
        }
        every { distributionRepository.getDistributionsForYear(LocalDateTime.now().year) } returns listOf(
            currentDistribution
        )

        val filename = exporter.getName()
        assertThat(filename).isEqualTo("TOeT_Tagesreports")

        val rows = exporter.getRows(currentStatistic)
        assertThat(rows).isEqualTo(
            listOf(
                listOf("TOeT Auswertung Stand: ${LocalDateTime.now().format(DATE_FORMATTER)} - Tagesreports"),
                listOf(
                    "Datum", "KW", "Versorgte Personen", "davon in NOST", "davon in Ausgabestelle", "davon Kinder < 3 Jahre", "Haushalte",
                    "Verlängert (Haushalte)", "Verlängert (Personen)", "Neue Kunden", "Neue Personen", "Ges. Spender", "Spender mit Ware",
                    "Warenmenge", "Kilometerleistung", "Anz. MitarbeiterInnen"
                ),
                listOf(
                    currentDistribution.startedAt!!.format(DATE_FORMATTER),
                    currentDistribution.startedAt!![IsoFields.WEEK_OF_WEEK_BASED_YEAR].toString(),
                    "25", "3", "22", "11", "10", "9", "8", "7", "6", "5", "4", "3.1", "2", "1",
                ),
            )
        )
    }

}

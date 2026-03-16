package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.csv.CsvUtil
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDetailData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsSettings
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.max

@Service
class StatisticsService(
    private val distributionRepository: DistributionRepository,
    private val entityManager: EntityManager,
) {

    companion object {
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun getSettings(): StatisticsSettings {
        val closedDistributions = distributionRepository.findAll()
            .filter { it.endedAt != null && it.startedAt != null }

        return StatisticsSettings(
            availableYears = closedDistributions
                .mapNotNull { it.startedAt?.year }
                .distinct()
                .sortedByDescending { it },
            distributions = closedDistributions.map {
                StatisticsDistribution(
                    startDate = it.startedAt!!,
                    endDate = it.endedAt!!
                )
            }
                .sortedByDescending { it.startDate }
        )
    }

    @Transactional
    fun getData(fromDate: LocalDate, toDate: LocalDate): StatisticsData {
        val countBeneficiaryCustomers = countBeneficiaryCustomers(fromDate, toDate)
        val countBeneficiaryCustomersData = StatisticsDetailData(
            title = countBeneficiaryCustomers.lastOrNull()?.value?.toString() ?: "0",
            subTitle = "Bezugsberechtigte Haushalte",
            labels = countBeneficiaryCustomers.map { it.label },
            dataPoints = countBeneficiaryCustomers.map { it.value }
        )

        val countBeneficiaryPersons = countBeneficiaryPersons(fromDate, toDate)
        val countBeneficiaryPersonsData = StatisticsDetailData(
            title = countBeneficiaryPersons.lastOrNull()?.value?.toString() ?: "0",
            subTitle = "Bezugsberechtigte Personen",
            labels = countBeneficiaryPersons.map { it.label },
            dataPoints = countBeneficiaryPersons.map { it.value }
        )

        val countBeneficiaryCustomersWithChildren = countBeneficiaryCustomersWithChildren(fromDate, toDate)
        val countBeneficiaryCustomersWithChildrenData = StatisticsDetailData(
            title = countBeneficiaryCustomersWithChildren.lastOrNull()?.value?.toString() ?: "0",
            subTitle = "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
            labels = countBeneficiaryCustomersWithChildren.map { it.label },
            dataPoints = countBeneficiaryCustomersWithChildren.map { it.value }
        )

        val countShelters = countShelters(fromDate, toDate)
        val countSheltersData = StatisticsDetailData(
            title = countShelters.sumOf { it.value.toLong() }.toString(),
            subTitle = "Notschlafstellen (Anzahl)",
            labels = countShelters.map { it.label },
            dataPoints = countShelters.map { it.value }
        )

        val averageShelters = averageShelters(fromDate, toDate)
        val averageSheltersTotalAverage =
            (averageShelters.sumOf { it.value.toDouble() } / max(averageShelters.size, 1)).let {
                String.format("%.2f", it)
            }
        val averageSheltersData = StatisticsDetailData(
            title = averageSheltersTotalAverage,
            subTitle = "Notschlafstellen (Durchschnitt pro Ausgabe)",
            labels = averageShelters.map { it.label },
            dataPoints = averageShelters.map { it.value }
        )

        return StatisticsData(
            beneficiaryCustomers = countBeneficiaryCustomersData,
            beneficiaryPersons = countBeneficiaryPersonsData,
            beneficiaryCustomersWithChildren = countBeneficiaryCustomersWithChildrenData,
            sheltersCount = countSheltersData,
            sheltersAverage = averageSheltersData
        )
    }

    fun countBeneficiaryCustomers(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(*)
                    FROM customers c
                    WHERE c.valid_until >= t.start_date
                    AND c.locked is not true
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun countBeneficiaryPersons(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(*)
                    FROM customers c
                    -- Left join ensures we still count the customer even if they have 0 additional persons
                    LEFT JOIN customers_addpersons ap ON c.id = ap.customer_id
                    WHERE c.valid_until >= t.start_date
                    AND c.locked is not true
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun countBeneficiaryCustomersWithChildren(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(DISTINCT c.id)
                    FROM customers c
                    JOIN customers_addpersons ap ON c.id = ap.customer_id
                    WHERE c.valid_until >= t.start_date
                    AND c.locked IS NOT TRUE
                    AND EXTRACT(YEAR FROM AGE(t.start_date, ap.birth_date)) <= 15
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun countShelters(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(DISTINCT dss.id) 
                    FROM distributions_statistics_shelters dss
                    JOIN distributions_statistics ds ON ds.id = dss.distribution_statistic_id
                    JOIN distributions d ON d.id = ds.distribution_id
                    WHERE d.started_at BETWEEN t.start_date AND t.end_date
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun averageShelters(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT 
                        CASE WHEN COUNT(DISTINCT d.id) = 0 THEN 0 
                        ELSE COUNT(dss.id)::FLOAT / COUNT(DISTINCT d.id)::FLOAT END
                    FROM distributions_statistics_shelters dss
                    JOIN distributions_statistics ds ON ds.id = dss.distribution_statistic_id
                    JOIN distributions d ON d.id = ds.distribution_id
                    WHERE d.started_at BETWEEN t.start_date AND t.end_date
                ) as average_value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    private fun executeStatsQuery(sql: String, fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val query = entityManager.createNativeQuery(sql)
        query.setParameter("fromDate", fromDate)
        query.setParameter("toDate", toDate)

        return query.resultList.map { row ->
            val cols = row as Array<*>
            StatisticsResult(
                label = cols[0] as String,
                value = cols[1] as Number
            )
        }
    }

    @Transactional
    fun generateCsv(fromDate: LocalDate, toDate: LocalDate): StatisticsCsvResult {
        val data = getData(fromDate, toDate)

        val rows: List<List<String>> = listOf(
            listOf(
                "Statistik-Export",
                "Zeitraum: ${DATE_TIME_FORMATTER.format(fromDate)} bis ${DATE_TIME_FORMATTER.format(toDate)}"
            ),
            listOf("Bezugsberechtigte Haushalte", data.beneficiaryCustomers.title),
            listOf("Bezugsberechtigte Personen", data.beneficiaryPersons.title),
            listOf(
                "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
                data.beneficiaryCustomersWithChildren.title
            ),
            listOf("Notschlafstellen (Anzahl)", data.sheltersCount.title),
            listOf("Notschlafstellen (Durchschnitt pro Ausgabe)", data.sheltersAverage.title),
        )

        return StatisticsCsvResult(
            filename = "statistik_export_${DATE_TIME_FORMATTER.format(fromDate)}_bis_${DATE_TIME_FORMATTER.format(toDate)}.csv",
            bytes = CsvUtil.writeRowsToByteArray(rows)
        )
    }

}

data class StatisticsResult(
    val label: String,
    val value: Number
)

@ExcludeFromTestCoverage
data class StatisticsCsvResult(
    val filename: String,
    val bytes: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as StatisticsCsvResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }

}

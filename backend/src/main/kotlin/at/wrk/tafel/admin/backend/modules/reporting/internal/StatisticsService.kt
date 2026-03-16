package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDetailData
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsSettings
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class StatisticsService(
    private val distributionRepository: DistributionRepository,
    private val entityManager: EntityManager,
) {

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
        val countBeneficiaryPersons = countBeneficiaryPersons(fromDate, toDate)
        val countBeneficiaryCustomersWithChildren = countBeneficiaryCustomersWithChildren(fromDate, toDate)
        val countShelters = countShelters(fromDate, toDate)
        val averageShelters = averageShelters(fromDate, toDate)

        return StatisticsData(
            beneficiaryCustomers = StatisticsDetailData(
                title = countBeneficiaryCustomers.lastOrNull()?.value?.toString() ?: "0",
                subTitle = "Bezugsberechtigte Haushalte",
                labels = countBeneficiaryCustomers.map { it.label },
                dataPoints = countBeneficiaryCustomers.map { it.value }
            ),
            beneficiaryPersons = StatisticsDetailData(
                title = countBeneficiaryPersons.lastOrNull()?.value?.toString() ?: "0",
                subTitle = "Bezugsberechtigte Personen",
                labels = countBeneficiaryPersons.map { it.label },
                dataPoints = countBeneficiaryPersons.map { it.value }
            ),
            beneficiaryCustomersWithChildren = StatisticsDetailData(
                title = countBeneficiaryCustomersWithChildren.lastOrNull()?.value?.toString() ?: "0",
                subTitle = "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
                labels = countBeneficiaryCustomersWithChildren.map { it.label },
                dataPoints = countBeneficiaryCustomersWithChildren.map { it.value }
            ),
            sheltersCount = StatisticsDetailData(
                title = countShelters.lastOrNull()?.value?.toString() ?: "0",
                subTitle = "Notschlafstellen (Anzahl)",
                labels = countShelters.map { it.label },
                dataPoints = countShelters.map { it.value }
            ),
            sheltersAverage = StatisticsDetailData(
                title = averageShelters.lastOrNull()?.value?.toString() ?: "0",
                subTitle = "Notschlafstellen (Durchschnitt pro Ausgabe)",
                labels = averageShelters.map { it.label },
                dataPoints = averageShelters.map { it.value }
            )
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
                value = (cols[1] as Number).toDouble()
            )
        }
    }

}

data class StatisticsResult(
    val label: String,
    val value: Double
)

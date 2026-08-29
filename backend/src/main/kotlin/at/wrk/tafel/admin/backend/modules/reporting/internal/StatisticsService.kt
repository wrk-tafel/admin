package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.csv.CsvUtil
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.reporting.ChildAgeCountItem
import at.wrk.tafel.admin.backend.modules.reporting.ChildItem
import at.wrk.tafel.admin.backend.modules.reporting.ChildrenAgeDistributionListResponse
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDetail
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsDistribution
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsResponse
import at.wrk.tafel.admin.backend.modules.reporting.StatisticsSettingsResponse
import jakarta.persistence.EntityManager
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.max

@Service
class StatisticsService(
    private val distributionRepository: DistributionRepository,
    private val personRepository: PersonRepository,
    private val entityManager: EntityManager,
) {

    companion object {
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val INTEGER_FORMATTER = NumberFormat.getIntegerInstance()

        private const val MIN_AGE = 0
        private const val MAX_AGE = 120

        private const val UNIT_KILOGRAM = "kg"
    }

    fun getSettings(): StatisticsSettingsResponse {
        val closedDistributions = distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc()
            .filter { it.endedAt != null }

        return StatisticsSettingsResponse(
            availableYears = closedDistributions
                .map { it.startedAt.year }
                .distinct()
                .sortedByDescending { it },
            distributions = closedDistributions.map {
                StatisticsDistribution(
                    startDate = it.startedAt,
                    endDate = it.endedAt!!,
                )
            }
                .sortedByDescending { it.startDate },
        )
    }

    @Transactional(readOnly = true)
    fun getData(fromDate: LocalDate, toDate: LocalDate): StatisticsResponse = StatisticsResponse(
        beneficiaryCustomers = lastValueDetail(
            subTitle = "Bezugsberechtigte Haushalte",
            results = countBeneficiaryCustomers(fromDate, toDate),
        ),
        beneficiaryPersons = lastValueDetail(
            subTitle = "Bezugsberechtigte Personen",
            results = countBeneficiaryPersons(fromDate, toDate),
        ),
        beneficiaryCustomersWithChildren = lastValueDetail(
            subTitle = "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
            results = countBeneficiaryCustomersWithChildren(fromDate, toDate),
        ),
        singleParentHouseholds = lastValueDetail(
            subTitle = "Alleinerzieher (Haushalte)",
            results = countSingleParentHouseholds(fromDate, toDate),
        ),
        sheltersCount = sumDetail(
            subTitle = "Notschlafstellen (Anzahl)",
            results = countShelters(fromDate, toDate),
        ),
        sheltersAverage = averageDetail(
            subTitle = "Notschlafstellen (Durchschnitt pro Ausgabe)",
            results = averageShelters(fromDate, toDate),
        ),
        sheltersPersonsCount = sumDetail(
            subTitle = "Versorgte Personen (Anzahl)",
            results = countSheltersPersons(fromDate, toDate),
        ),
        shopsCount = sumDetail(
            subTitle = "Spender (Anzahl)",
            results = countShops(fromDate, toDate),
        ),
        shopItemsTotal = sumDetail(
            subTitle = "Warenmenge (Gesamt)",
            results = totalShopItems(fromDate, toDate),
            unit = UNIT_KILOGRAM,
        ),
        shopItemsAverage = averageDetail(
            subTitle = "Warenmenge (Durchschnitt pro Spender)",
            results = averageShopItems(fromDate, toDate),
            unit = UNIT_KILOGRAM,
        ),
    )

    /**
     * A key figure whose headline is the *state* at the end of the period (how many households were
     * entitled), so the last point of the course is what it reads - not a total over the period.
     */
    private fun lastValueDetail(subTitle: String, results: List<StatisticsResult>): StatisticsDetail = countDetail(subTitle, results, results.lastOrNull()?.value?.toLong() ?: 0L)

    /**
     * A key figure that accumulates over the period (shelters served, kilograms collected), so its
     * headline is the total of the whole course. Rounded once on the summed total rather than per
     * period, since a per-period `toLong()` would truncate a decimal figure like collected kilograms
     * on every point of the course instead of just the headline.
     */
    private fun sumDetail(subTitle: String, results: List<StatisticsResult>, unit: String? = null): StatisticsDetail = countDetail(subTitle, results, Math.round(results.sumOf { it.value.toDouble() }), unit)

    private fun countDetail(
        subTitle: String,
        results: List<StatisticsResult>,
        value: Long,
        unit: String? = null,
    ): StatisticsDetail = detail(
        title = INTEGER_FORMATTER.format(value).withUnit(unit),
        subTitle = subTitle,
        value = value.toDouble(),
        unit = unit,
        results = results,
    )

    /**
     * The average per data point that actually happened: periods without any distribution
     * (a bucket of the timeline with no data at all) would otherwise pull the average towards zero,
     * which is why the divisor only counts the non-zero ones - and never drops below 1, since
     * dividing by zero is what an entirely empty period would do.
     */
    private fun averageDetail(subTitle: String, results: List<StatisticsResult>, unit: String? = null): StatisticsDetail {
        val divisor = max(results.count { it.value.toDouble() > 0 }, 1)
        val average = results.sumOf { it.value.toDouble() } / divisor

        return detail(
            title = String.format("%.2f", average).withUnit(unit),
            subTitle = subTitle,
            value = average,
            unit = unit,
            results = results,
        )
    }

    private fun detail(
        title: String,
        subTitle: String,
        value: Double,
        unit: String?,
        results: List<StatisticsResult>,
    ) = StatisticsDetail(
        title = title,
        subTitle = subTitle,
        value = value,
        unit = unit,
        labels = results.map { it.label },
        dataPoints = results.map { it.value },
    )

    private fun String.withUnit(unit: String?): String = unit?.let { "$this $it" } ?: this

    /**
     * The four key figures below all read "the households entitled during this stretch of the
     * timeline": still valid when it began, and already registered by the time it ended. The second
     * half is what `h.created_at` is doing there - without it every household ever registered would
     * be counted for every point of the timeline, including the years before it existed, so the
     * curve could only ever fall and a period always looked worse than the one before it.
     *
     * `created_at` is measured against the bucket's *end* rather than its start so the newest point
     * - the one the headline is read off - includes a household registered today.
     */
    fun countBeneficiaryCustomers(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(*)
                    FROM households h
                    WHERE h.valid_until >= t.start_date
                    AND h.created_at < t.end_date + 1
                    AND h.locked is not true
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
                    FROM households h
                    -- every household member is a row in persons, including the main person
                    JOIN persons p ON p.household_id = h.id
                    WHERE h.valid_until >= t.start_date
                    AND h.created_at < t.end_date + 1
                    AND h.locked is not true
                    AND p.exclude_household = false
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
                    SELECT COUNT(DISTINCT h.id)
                    FROM households h
                    JOIN persons p ON p.household_id = h.id
                    WHERE h.valid_until >= t.start_date
                    AND h.created_at < t.end_date + 1
                    AND h.locked IS NOT TRUE
                    AND p.is_main_person = false
                    AND p.exclude_household = false
                    -- at least 0, so a member born after this point of the timeline - whose AGE()
                    -- is negative there - is not counted as a child back then
                    AND EXTRACT(YEAR FROM AGE(t.start_date, p.birth_date)) BETWEEN 0 AND 15
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun countSingleParentHouseholds(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(*)
                    FROM households h
                    WHERE h.valid_until >= t.start_date
                    AND h.created_at < t.end_date + 1
                    AND h.locked is not true
                    AND h.single_parent is true
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
                    WHERE DATE(d.started_at) BETWEEN t.start_date AND t.end_date
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
                    WHERE DATE(d.started_at) BETWEEN t.start_date AND t.end_date
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun countSheltersPersons(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT SUM(dss.persons_count)
                    FROM distributions_statistics_shelters dss
                    JOIN distributions_statistics ds ON ds.id = dss.distribution_statistic_id
                    JOIN distributions d ON d.id = ds.distribution_id
                    WHERE DATE(d.started_at) BETWEEN t.start_date AND t.end_date
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun countShops(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT 
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT COUNT(DISTINCT fci.shop_id)
                    FROM distributions d
                    JOIN food_collections fc ON d.id = fc.distribution_id
                    JOIN food_collections_items fci ON fc.id = fci.food_collection_id
                    WHERE DATE(d.started_at) BETWEEN t.start_date AND t.end_date
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun totalShopItems(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT SUM(fci.weight)
                    FROM distributions d
                    JOIN food_collections fc ON d.id = fc.distribution_id
                    JOIN food_collections_items fci ON fc.id = fci.food_collection_id
                    WHERE DATE(d.started_at) BETWEEN t.start_date AND t.end_date
                ) as value
            FROM get_timeline(:fromDate, :toDate) t
            ORDER BY t.start_date ASC
        """.trimIndent()

        return executeStatsQuery(sql, fromDate, toDate)
    }

    fun averageShopItems(fromDate: LocalDate, toDate: LocalDate): List<StatisticsResult> {
        val sql = """
            SELECT
                format_by_resolution(t.start_date, t.res_code) as label,
                (
                    SELECT
                        CASE WHEN COUNT(DISTINCT d.id) = 0 THEN 0
                        ELSE SUM(fci.weight)::FLOAT / COUNT(DISTINCT fci.shop_id)::FLOAT END
                    FROM distributions d
                    JOIN food_collections fc ON d.id = fc.distribution_id
                    JOIN food_collections_items fci ON fc.id = fci.food_collection_id
                    WHERE DATE(d.started_at) BETWEEN t.start_date AND t.end_date
                ) as value
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
            val label = cols[0] as String
            val value = cols[1] as? Number ?: 0
            // Locale.ROOT (dot decimal separator) here, not the JVM default (de-DE, comma separator) - this
            // round-trips through Kotlin's locale-independent String.toDouble(), which would throw
            // NumberFormatException on a comma-formatted string like "0,00".
            val valueFormatted = if (value is Double) String.format(Locale.ROOT, "%.2f", value).toDouble() else value

            StatisticsResult(
                label = label,
                value = valueFormatted,
            )
        }
    }

    @Transactional(readOnly = true)
    fun generateCsv(fromDate: LocalDate, toDate: LocalDate): StatisticsCsvResult {
        val data = getData(fromDate, toDate)

        val rows: List<List<String>> = listOf(
            listOf(
                "Statistik-Export",
                "Zeitraum: ${DATE_TIME_FORMATTER.format(fromDate)} bis ${DATE_TIME_FORMATTER.format(toDate)}",
            ),
            listOf("Bezugsberechtigte Haushalte", data.beneficiaryCustomers.title),
            listOf("Bezugsberechtigte Personen", data.beneficiaryPersons.title),
            listOf(
                "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
                data.beneficiaryCustomersWithChildren.title,
            ),
            listOf("Alleinerzieher (Haushalte)", data.singleParentHouseholds.title),
            listOf("Notschlafstellen (Anzahl)", data.sheltersCount.title),
            listOf("Notschlafstellen (Durchschnitt pro Ausgabe)", data.sheltersAverage.title),
            listOf("Notschlafstellen (versorgte Personen pro Ausgabe)", data.sheltersPersonsCount.title),
            listOf("Spender (Anzahl)", data.shopsCount.title),
            listOf("Warenmenge (Gesamt)", data.shopItemsTotal.title),
            listOf("Warenmenge (Durchschnitt pro Spender)", data.shopItemsAverage.title),
        )

        return StatisticsCsvResult(
            filename = "statistik_export_${DATE_TIME_FORMATTER.format(fromDate)}_bis_${DATE_TIME_FORMATTER.format(toDate)}.csv",
            bytes = CsvUtil.writeRowsToByteArray(rows),
        )
    }

    /**
     * The children of currently entitled households as a CSV: every additional (non-main) member of
     * a valid household whose age falls in the given (inclusive) age range, one row per person,
     * ordered by the household's business number. Ordering school starter packages is one thing the
     * export is read for (it replaced that ad-hoc SQL, see `_reporting/reporting.sql`) - the age
     * range is a parameter rather than a constant precisely because the question is asked with
     * different ages for different purposes.
     *
     * Exports every match, never a page - the CSV is what gets acted on, the paginated
     * [getChildrenData] only the on-screen evidence for it.
     */
    @Transactional(readOnly = true)
    fun generateChildrenCsv(
        ageMin: Int,
        ageMax: Int,
        referenceDate: LocalDate? = null,
    ): StatisticsCsvResult {
        validateAgeRange(ageMin, ageMax)
        val ageDate = referenceDate ?: LocalDate.now()
        val rows = personRepository.findAll(childrenSpec(ageMin, ageMax, ageDate))
            .map { it.toChildItem(ageDate) }

        val csvRows: List<List<String>> = listOf(
            listOf("Haushalt", "Vorname", "Nachname", "Alter"),
        ) + rows.map { listOf(it.householdId.toString(), it.firstname, it.lastname, it.age.toString()) }

        return StatisticsCsvResult(
            filename = "auswertung_kinder_${DATE_TIME_FORMATTER.format(LocalDate.now())}.csv",
            bytes = CsvUtil.writeRowsToByteArray(csvRows),
        )
    }

    /**
     * Filters and paginates at the DB level: "age in [ageMin, ageMax]" is expressed as a plain
     * `birthDate` range (see [childrenFilter]) rather than computing age in the query
     * (e.g. via Postgres' `age()`), so it stays a straightforward, index-friendly column
     * comparison that a JPA `Specification`/`Pageable` can paginate directly - no in-memory
     * slicing needed, unlike `HouseholdService.getHouseholdsAboveLimit()`.
     */
    @Transactional(readOnly = true)
    fun getChildrenData(
        ageMin: Int,
        ageMax: Int,
        page: Int? = null,
        pageSize: Int? = null,
        referenceDate: LocalDate? = null,
    ): PagedResponse<ChildItem> {
        validateAgeRange(ageMin, ageMax)
        val ageDate = referenceDate ?: LocalDate.now()
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))
        val pagedResult = personRepository.findAll(childrenSpec(ageMin, ageMax, ageDate), pageRequest)

        return PagedResponse(
            items = pagedResult.content.map { it.toChildItem(ageDate) },
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * How the matches of [getChildrenData] split up per age year - what is handed out per child
     * usually differs by age group, so the split is what actually gets planned, not just the total.
     *
     * Covers the whole result set rather than the current page, and reports every age in the
     * requested range including the empty ones, so the chart drawn from it keeps its gaps instead
     * of silently closing them.
     */
    @Transactional(readOnly = true)
    fun getChildrenAgeDistribution(
        ageMin: Int,
        ageMax: Int,
        referenceDate: LocalDate? = null,
    ): ChildrenAgeDistributionListResponse {
        validateAgeRange(ageMin, ageMax)
        val ageDate = referenceDate ?: LocalDate.now()

        val countsByAge = selectBirthDates(childrenFilter(ageMin, ageMax, ageDate))
            .groupingBy { ChronoUnit.YEARS.between(it, ageDate).toInt() }
            .eachCount()

        return ChildrenAgeDistributionListResponse(
            items = (ageMin..ageMax).map { age ->
                ChildAgeCountItem(age = age, count = countsByAge[age] ?: 0)
            },
        )
    }

    /**
     * Reads only the `birthDate` column of the matching persons - the ages are then counted in
     * memory. One query for the whole distribution, rather than a `count(*)` per age year (which
     * would be a query per bar), and no entities loaded for rows that are never rendered.
     */
    private fun selectBirthDates(spec: Specification<PersonEntity>): List<LocalDate> {
        val criteriaBuilder = entityManager.criteriaBuilder
        val query = criteriaBuilder.createQuery(LocalDate::class.java)
        val root = query.from(PersonEntity::class.java)

        query.select(root["birthDate"])
        spec.toPredicate(root, query, criteriaBuilder)?.let { query.where(it) }

        return entityManager.createQuery(query).resultList
    }

    /**
     * Guards the age-to-`birthDate` math below against a range that can only be a mistake - an
     * inverted range silently returns nothing, and an unbounded [ageMax] would blow up the
     * per-age-year list of [getChildrenAgeDistribution]. The frontend rejects the same input before
     * sending it; this is what makes the API itself safe to call directly.
     */
    private fun validateAgeRange(ageMin: Int, ageMax: Int) {
        if (ageMin < MIN_AGE || ageMax > MAX_AGE) {
            throw BusinessRuleException("Alter muss zwischen $MIN_AGE und $MAX_AGE Jahren liegen!")
        }
        if (ageMin > ageMax) {
            throw BusinessRuleException("'Alter von' darf nicht größer als 'Alter bis' sein!")
        }
    }

    /**
     * age >= ageMin  <=>  birthDate <= referenceDate.minusYears(ageMin)
     * age <= ageMax  <=>  birthDate >= referenceDate.minusYears(ageMax + 1).plusDays(1)
     * (matches [java.time.temporal.ChronoUnit.YEARS]' truncation, used to compute the displayed
     * age in [toChildItem])
     *
     * [referenceDate] is the date the *age* is measured on - what is planned from these numbers is
     * ordered weeks ahead, so a child turning 6 in August has to be countable in June. Household
     * validity deliberately stays "entitled today" (see [PersonEntity.Specs.householdIsValid]): a
     * household whose entitlement runs out before the reference date is usually renewed, and
     * leaving it out would undercount.
     */
    private fun childrenFilter(ageMin: Int, ageMax: Int, referenceDate: LocalDate): Specification<PersonEntity> {
        val maxBirthDate = referenceDate.minusYears(ageMin.toLong())
        val minBirthDate = referenceDate.minusYears(ageMax + 1L).plusDays(1)

        return Specification.allOf(
            PersonEntity.Specs.isAdditionalPerson(),
            PersonEntity.Specs.householdIsValid(),
            PersonEntity.Specs.birthDateBetween(minBirthDate, maxBirthDate),
        )
    }

    private fun childrenSpec(ageMin: Int, ageMax: Int, referenceDate: LocalDate): Specification<PersonEntity> = PersonEntity.Specs.orderByHouseholdId(childrenFilter(ageMin, ageMax, referenceDate))

    private fun PersonEntity.toChildItem(referenceDate: LocalDate): ChildItem {
        val age = ChronoUnit.YEARS.between(birthDate, referenceDate).toInt()

        return ChildItem(
            householdId = household.householdId,
            firstname = firstname.orEmpty(),
            lastname = lastname.orEmpty(),
            age = age,
        )
    }
}

data class StatisticsResult(
    val label: String,
    val value: Number,
)

@ExcludeFromTestCoverage
data class StatisticsCsvResult(
    val filename: String,
    val bytes: ByteArray,
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

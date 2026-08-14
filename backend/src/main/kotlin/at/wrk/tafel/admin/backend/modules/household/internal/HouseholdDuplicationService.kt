package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.household.HouseholdDuplicateDismissalEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdDuplicateDismissalRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.jdbc.core.DataClassRowMapper
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.SingleColumnRowMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Fuzzy-matches households against each other to surface likely duplicate registrations for
 * manual review (never auto-merges, only lists candidates).
 *
 * A pair is flagged as a possible duplicate when, on the main person's name and the household
 * address, both:
 * - `soundex(lastname)` and `soundex(firstname)` match (phonetic match, tolerant of spelling
 *   variants), and
 * - the Levenshtein distance of the concatenated name is below 4, and the Levenshtein distance
 *   of the concatenated street/house-number/door is below 10.
 *
 * Implemented as raw SQL (via [JdbcTemplate]) rather than JPA/Specifications because `soundex`
 * and `levenshtein` are Postgres functions with no JPQL equivalent; the query self-joins
 * `households`/`persons` twice (`household` vs `compare`) to compare every pair.
 *
 * `household.household_id < compare.household_id` in [DUPLICATE_CONDITIONS] is deliberately a
 * strict inequality, not `<>`: the self-join is symmetric, so an unordered match {A, B} would
 * otherwise surface as two separate rows - once anchored on A (with B as the only similar
 * household) and once anchored on B (with A as the only similar household) - showing the exact
 * same pair to the reviewer twice. Requiring the anchor's `household_id` to be the *smaller* of
 * the two collapses that back down to a single row.
 */
@Service
class HouseholdDuplicationService(
    private val householdRepository: HouseholdRepository,
    private val householdConverter: HouseholdConverter,
    private val jdbcTemplate: JdbcTemplate,
    private val householdDuplicateDismissalRepository: HouseholdDuplicateDismissalRepository,
) {

    companion object {
        // firstname/lastname no longer live on the household row - they belong to its main person
        private val MAIN_PERSON_CTE = """
            WITH household AS (SELECT h.id,
                                      h.household_id,
                                      p.firstname,
                                      p.lastname,
                                      h.address_street,
                                      h.address_housenumber,
                                      h.address_door
                               FROM households h
                                        JOIN persons p ON p.id = h.main_person_id),
                 compare AS (SELECT h.id,
                                    h.household_id,
                                    p.firstname,
                                    p.lastname,
                                    h.address_street,
                                    h.address_housenumber,
                                    h.address_door
                             FROM households h
                                      JOIN persons p ON p.id = h.main_person_id)
        """.trimIndent()

        private val DUPLICATE_CONDITIONS = """
            WHERE household.household_id < compare.household_id
              AND household.id <> compare.id
              AND soundex(household.lastname) = soundex(compare.lastname)
              AND soundex(household.firstname) = soundex(compare.firstname)
              AND levenshtein(
                          lower(
                                  concat(household.firstname,
                                         household.lastname)
                          ),
                          lower(
                                  concat(compare.firstname,
                                         compare.lastname)
                          )
                  ) < 4
              AND levenshtein(
                          lower(
                                  concat(household.address_street,
                                         household.address_housenumber,
                                         household.address_door)
                          ),
                          lower(
                                  concat(compare.address_street,
                                         compare.address_housenumber,
                                         compare.address_door)
                          )
                  ) < 10
              -- household.household_id < compare.household_id above already guarantees the low/high
              -- order dismiss() normalizes to, so no LEAST/GREATEST needed here.
              AND NOT EXISTS (
                  SELECT 1
                  FROM household_duplicate_dismissals dismissal
                  WHERE dismissal.household_id_low = household.household_id
                    AND dismissal.household_id_high = compare.household_id
              )
        """.trimIndent()
    }

    @Transactional(readOnly = true)
    fun findDuplicates(page: Int?): HouseholdDuplicateSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 1)

        val duplicatesPage = loadDuplicates(pageRequest)

        val items = duplicatesPage.map { entry ->
            val householdId = entry.householdId
            val similarHouseholds = entry.compareHouseholdIdList.split(",")

            HouseholdDuplicateSearchResultItem(
                household = householdConverter.mapEntityToHousehold(
                    householdRepository.findByHouseholdId(householdId)!!,
                ),
                similarHouseholds = similarHouseholds.mapNotNull { similarHouseholdId ->
                    householdRepository.findByHouseholdId(similarHouseholdId.toLong())
                        ?.let { householdConverter.mapEntityToHousehold(it) }
                },
            )
        }.toList()

        return HouseholdDuplicateSearchResult(
            items = items,
            totalCount = duplicatesPage.totalElements,
            currentPage = page ?: 1,
            totalPages = duplicatesPage.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * Records that [householdId] and [otherHouseholdId] were reviewed and judged not to be a
     * duplicate, so [findDuplicates] stops surfacing that specific pair - without this, a decision
     * made once would reappear on every future visit. Idempotent: dismissing an already-dismissed
     * pair again is a no-op rather than a constraint violation. The order the two ids are given in
     * doesn't matter - they're normalized into `household_id_low`/`household_id_high` here, matching
     * the ordering [DUPLICATE_CONDITIONS] already relies on for its anti-join.
     *
     * `saveAndFlush` rather than `save`: [findDuplicates] reads this table back through a plain
     * [JdbcTemplate] query, which Hibernate has no way to auto-flush ahead of - an unflushed insert
     * would be invisible to it within the same transaction (e.g. a caller that dismisses and then
     * immediately re-lists on one request).
     */
    @Transactional
    fun dismiss(householdId: Long, otherHouseholdId: Long) {
        val low = minOf(householdId, otherHouseholdId)
        val high = maxOf(householdId, otherHouseholdId)

        if (!householdDuplicateDismissalRepository.existsByHouseholdIdLowAndHouseholdIdHigh(low, high)) {
            householdDuplicateDismissalRepository.saveAndFlush(
                HouseholdDuplicateDismissalEntity(householdIdLow = low, householdIdHigh = high),
            )
        }
    }

    private fun loadDuplicates(pageable: Pageable): Page<HouseholdDuplicateEntry> {
        val rowCountSql = """
            $MAIN_PERSON_CTE
            SELECT count(distinct household.household_id)
            FROM household,
                 compare
            $DUPLICATE_CONDITIONS;
        """.trimIndent()
        val totalCount = jdbcTemplate.query(rowCountSql, SingleColumnRowMapper<Long>()).first() ?: 0

        val sql = """
            $MAIN_PERSON_CTE
            SELECT household.household_id                                                                      as householdId,
                   string_agg(compare.household_id::character varying, ',' order by compare.household_id desc) as compareHouseholdIdList
            FROM household,
                 compare
            $DUPLICATE_CONDITIONS
            group by household.id, household.household_id
            order by household.household_id desc
            LIMIT ${pageable.pageSize} OFFSET ${pageable.offset}
        """.trimIndent()

        val rows = jdbcTemplate.query(sql, DataClassRowMapper(HouseholdDuplicateEntry::class.java))
        return PageImpl(rows, pageable, totalCount)
    }
}

@ExcludeFromTestCoverage
data class HouseholdDuplicateEntry(
    val householdId: Long,
    val compareHouseholdIdList: String,
)

@ExcludeFromTestCoverage
data class HouseholdDuplicateSearchResult(
    val items: List<HouseholdDuplicateSearchResultItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

@ExcludeFromTestCoverage
data class HouseholdDuplicateSearchResultItem(
    val household: HouseholdResponse,
    val similarHouseholds: List<HouseholdResponse>,
)

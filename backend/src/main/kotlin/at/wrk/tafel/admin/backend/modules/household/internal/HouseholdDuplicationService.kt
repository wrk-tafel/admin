package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
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
import java.time.LocalDate

/**
 * Fuzzy-matches households against each other to surface likely duplicate registrations for
 * manual review (never auto-merges, only lists candidates).
 *
 * A pair is flagged as a possible duplicate when either of two independent signals matches -
 * [MATCHING_HOUSEHOLD_PAIRS_CTE]'s `main_person_pairs`/`person_pairs` branches:
 * - **main person + address**: on the two households' main persons' `duplicate_name_key`,
 *   `soundex()` matches (phonetic match, tolerant of spelling variants) and the Levenshtein
 *   distance is below 4, **and** the Levenshtein distance of the concatenated
 *   street/house-number/door is below 10.
 * - **any shared person**: any person (main or additional) of one household has the same
 *   `birth_date` and a fuzzy-matching `duplicate_name_key` as any person (main or additional) of
 *   the other, address ignored. This is what catches a family re-registered with a *different*
 *   member now flagged as main person (e.g. a household re-registered under an adult child instead
 *   of the parent who first registered it) - the main-person-only signal above compares two
 *   different individuals in that case and would never match, even though most of the household is
 *   identical. Address is deliberately not part of this signal: a re-registration may well have
 *   been entered at a different address than the original.
 *
 * `persons.duplicate_name_key` (`R__00119_duplicate_name_key_persisted.sql`) lower-cases a
 * person's combined firstname+lastname and sorts its words into a canonical order, kept in sync by
 * a trigger - the same pattern as the `search_text` columns from `R__00088_fulltext_search.sql`.
 * Comparing per-field (`soundex(lastname)` against `soundex(lastname)`, `soundex(firstname)`
 * against `soundex(firstname)`) instead of on this sorted key would miss a pair where the same
 * words are split across firstname/lastname differently between the two registrations - e.g. a
 * double surname where one record puts the second word in `lastname` and the other puts it in
 * `firstname`: the leading letter soundex keys off would differ, and levenshtein would see a block
 * transposition rather than a small edit, so neither field's per-field comparison would match even
 * though a human reads the two names as identical.
 *
 * `duplicate_name_key` is persisted rather than computed inline (`household_duplicate_name_key(
 * firstname, lastname)`, also in `R__00118`/`R__00119`) precisely because [MATCHING_HOUSEHOLD_PAIRS_CTE]
 * evaluates it across every household/person pair: that function's body is a `SELECT` over
 * `unnest()`/`string_agg()`, which Postgres cannot inline into the calling query the way it inlines
 * a plain expression, so calling it per pair instead of reading an already-computed column turned
 * this query into a multi-second load once run against production's household count.
 * `household_duplicate_name_key` itself is still used directly in [MAIN_PERSON_SIMILARITY_SQL]/
 * [PERSON_SIMILARITY_SQL] for the literal not-yet-saved value [findPotentialDuplicates] checks,
 * where it runs once per call rather than once per household pair.
 *
 * Implemented as raw SQL (via [JdbcTemplate]) rather than JPA/Specifications because `soundex`
 * and `levenshtein` are Postgres functions with no JPQL equivalent; the query self-joins
 * `households`/`persons` to compare every pair, both at the main-person and at the person level.
 *
 * `household_id < compare_household_id` in [DUPLICATE_CONDITIONS] is deliberately a strict
 * inequality, not `<>`: both branches of `matching_pairs` are symmetric, so an unordered match
 * {A, B} would otherwise surface as two separate rows - once anchored on A (with B as the only
 * similar household) and once anchored on B (with A as the only similar household) - showing the
 * exact same pair to the reviewer twice. Requiring the anchor's `household_id` to be the *smaller*
 * of the two collapses that back down to a single row.
 */
@Service
class HouseholdDuplicationService(
    private val householdRepository: HouseholdRepository,
    private val householdConverter: HouseholdConverter,
    private val jdbcTemplate: JdbcTemplate,
    private val householdDuplicateDismissalRepository: HouseholdDuplicateDismissalRepository,
    private val auditLogWriter: AuditLogWriter,
) {

    companion object {
        // firstname/lastname no longer live on the household row - they belong to its persons.
        // Both branches are symmetric (an unordered pair {A, B} surfaces as both (A, B) and
        // (B, A)) - DUPLICATE_CONDITIONS' household_id < compare_household_id collapses that back
        // down to one row per pair.
        private val MATCHING_HOUSEHOLD_PAIRS_CTE = """
            WITH matching_pairs AS (
                SELECT h1.household_id AS household_id, h2.household_id AS compare_household_id
                FROM households h1
                         JOIN persons p1 ON p1.id = h1.main_person_id
                         JOIN households h2 ON h2.id <> h1.id
                         JOIN persons p2 ON p2.id = h2.main_person_id
                WHERE soundex(p1.duplicate_name_key) = soundex(p2.duplicate_name_key)
                  AND levenshtein(p1.duplicate_name_key, p2.duplicate_name_key) < 4
                  AND levenshtein(
                              lower(concat(h1.address_street, h1.address_housenumber, h1.address_door)),
                              lower(concat(h2.address_street, h2.address_housenumber, h2.address_door))
                      ) < 10
                UNION
                SELECT h1.household_id AS household_id, h2.household_id AS compare_household_id
                FROM persons p1
                         JOIN households h1 ON h1.id = p1.household_id
                         JOIN persons p2 ON p2.household_id <> p1.household_id
                                         AND p2.birth_date = p1.birth_date
                                         AND soundex(p2.duplicate_name_key) = soundex(p1.duplicate_name_key)
                                         AND levenshtein(p2.duplicate_name_key, p1.duplicate_name_key) < 4
                         JOIN households h2 ON h2.id = p2.household_id
                WHERE p1.birth_date IS NOT NULL
            )
        """.trimIndent()

        private val DUPLICATE_CONDITIONS = """
            WHERE household_id < compare_household_id
              -- household_id < compare_household_id above already guarantees the low/high order
              -- dismiss() normalizes to, so no LEAST/GREATEST needed here.
              AND NOT EXISTS (
                  SELECT 1
                  FROM household_duplicate_dismissals dismissal
                  WHERE dismissal.household_id_low = matching_pairs.household_id
                    AND dismissal.household_id_high = matching_pairs.compare_household_id
              )
        """.trimIndent()

        // Same fuzzy name+address rules as MATCHING_HOUSEHOLD_PAIRS_CTE's main-person branch, but parameterized
        // against literal in-flight values instead of self-joining persisted rows - used by
        // findPotentialDuplicates. The `? IS NULL OR ...` exclusion matches every household when a
        // `null` id is bound, which is what a create (no household to exclude yet) passes. Every
        // bind parameter is explicitly cast (`::bigint`/`::text`/`::date`) - `concat()`/`soundex()`/
        // `levenshtein()` are polymorphic, so Postgres can't infer a parameter's type from them alone,
        // and a parameter used only once (address_door is often unset) has no other occurrence to
        // infer it from either; left uncast, a `null` bind fails with "could not determine data type
        // of parameter $n" instead of a normal 0-row result.
        private val MAIN_PERSON_SIMILARITY_SQL = """
            SELECT h.household_id as householdId, p.firstname as firstname, p.lastname as lastname
            FROM households h
                     JOIN persons p ON p.id = h.main_person_id
            WHERE (?::bigint IS NULL OR h.household_id <> ?::bigint)
              AND soundex(p.duplicate_name_key) = soundex(household_duplicate_name_key(?::text, ?::text))
              AND levenshtein(p.duplicate_name_key, household_duplicate_name_key(?::text, ?::text)) < 4
              AND levenshtein(
                          lower(concat(h.address_street, h.address_housenumber, h.address_door)),
                          lower(concat(?::text, ?::text, ?::text))
                  ) < 10
              AND (
                  ?::bigint IS NULL OR NOT EXISTS (
                      SELECT 1
                      FROM household_duplicate_dismissals dismissal
                      WHERE dismissal.household_id_low = LEAST(h.household_id, ?::bigint)
                        AND dismissal.household_id_high = GREATEST(h.household_id, ?::bigint)
                  )
              )
        """.trimIndent()

        // Person-level equivalent: fuzzy name plus an exact birth date match against every person in
        // the system (main or additional), address ignored - a person carries no address of its own,
        // and a re-registered duplicate may well have been entered at a different one.
        private val PERSON_SIMILARITY_SQL = """
            SELECT h.household_id as householdId, p.firstname as firstname, p.lastname as lastname
            FROM persons p
                     JOIN households h ON h.id = p.household_id
            WHERE (?::bigint IS NULL OR h.household_id <> ?::bigint)
              AND p.birth_date = ?::date
              AND soundex(p.duplicate_name_key) = soundex(household_duplicate_name_key(?::text, ?::text))
              AND levenshtein(p.duplicate_name_key, household_duplicate_name_key(?::text, ?::text)) < 4
              AND (
                  ?::bigint IS NULL OR NOT EXISTS (
                      SELECT 1
                      FROM household_duplicate_dismissals dismissal
                      WHERE dismissal.household_id_low = LEAST(h.household_id, ?::bigint)
                        AND dismissal.household_id_high = GREATEST(h.household_id, ?::bigint)
                  )
              )
        """.trimIndent()
    }

    /**
     * The proactive counterpart to [findDuplicates]: checks a household's not-yet-saved data for
     * likely duplicates against already-persisted data, so [HouseholdService.createHousehold]/
     * [HouseholdService.updateHousehold] can warn before writing it instead of only surfacing the
     * duplicate afterwards in the [findDuplicates] review queue.
     *
     * Two independent signals, since a person carries no address of its own:
     * - the main person's name (fuzzy, same soundex/Levenshtein rules as [findDuplicates]) together
     *   with the household's address - the same signal [findDuplicates] uses to flag two households
     *   as duplicates of each other.
     * - every person's (main and additional) name (fuzzy) together with an exact birth date match
     *   against every person already in the system, address ignored - this is what catches a single
     *   household member re-registered under a new household at a different address, which the
     *   address-anchored check above would otherwise miss.
     *
     * [excludeHouseholdId] is the household being saved itself (`null` on create), so an update never
     * flags itself as its own duplicate.
     */
    @Transactional(readOnly = true)
    fun findPotentialDuplicates(
        mainPersonFirstname: String,
        mainPersonLastname: String,
        addressStreet: String?,
        addressHouseNumber: String?,
        addressDoor: String?,
        persons: List<PersonNameAndBirthDate>,
        excludeHouseholdId: Long?,
    ): List<HouseholdDuplicateCandidate> {
        val householdMatches = jdbcTemplate.query(
            MAIN_PERSON_SIMILARITY_SQL,
            DataClassRowMapper(HouseholdDuplicateCandidateRow::class.java),
            excludeHouseholdId,
            excludeHouseholdId,
            mainPersonFirstname,
            mainPersonLastname,
            mainPersonFirstname,
            mainPersonLastname,
            addressStreet,
            addressHouseNumber,
            addressDoor,
            excludeHouseholdId,
            excludeHouseholdId,
            excludeHouseholdId,
        ).toList()

        val personMatches = persons.flatMap { person ->
            jdbcTemplate.query(
                PERSON_SIMILARITY_SQL,
                DataClassRowMapper(HouseholdDuplicateCandidateRow::class.java),
                excludeHouseholdId,
                excludeHouseholdId,
                person.birthDate,
                person.firstname,
                person.lastname,
                person.firstname,
                person.lastname,
                excludeHouseholdId,
                excludeHouseholdId,
                excludeHouseholdId,
            )
        }

        return (householdMatches + personMatches)
            .distinctBy { it.householdId }
            .map { HouseholdDuplicateCandidate(householdId = it.householdId, personName = "${it.firstname} ${it.lastname}") }
    }

    /**
     * Not read-only: every call records an `AuditOperation.READ` - each page embeds full household
     * records for the anchor and every similar household, not one (GDPR G24, issue #3507).
     */
    @Transactional
    fun findDuplicates(page: Int?): HouseholdDuplicateSearchResult {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.HOUSEHOLD_DUPLICATES_ENTITY_TYPE,
                entityId = null,
                businessKey = page?.let { "page=$it" },
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )

        val pageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), 1)

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
            $MATCHING_HOUSEHOLD_PAIRS_CTE
            SELECT count(distinct household_id)
            FROM matching_pairs
            $DUPLICATE_CONDITIONS;
        """.trimIndent()
        val totalCount = jdbcTemplate.query(rowCountSql, SingleColumnRowMapper<Long>()).first() ?: 0

        // `matches` is deliberately MATERIALIZED: matching pairs are rare (a handful out of every
        // few thousand households) and can sit anywhere in the household_id range, so an
        // `ORDER BY household_id DESC LIMIT n` on the un-materialized join tempts the planner into
        // driving off a backward index scan on household_id in the hope of stopping after the
        // first match - which, since matches are sparse, means it walks most of the table anyway,
        // evaluating the expensive address levenshtein() filter on nearly every household pair
        // before the cheap soundex-indexed name filter ever narrows anything down. Materializing
        // forces the join+group to run once as a whole (the cheap soundex-first plan the row-count
        // query above already gets), with only the small resulting match set left to sort/paginate.
        val sql = """
            $MATCHING_HOUSEHOLD_PAIRS_CTE,
                 matches AS MATERIALIZED (
                     SELECT household_id                                                                as householdId,
                            string_agg(compare_household_id::character varying, ',' order by compare_household_id desc) as compareHouseholdIdList
                     FROM matching_pairs
                     $DUPLICATE_CONDITIONS
                     group by household_id
                 )
            SELECT householdId, compareHouseholdIdList
            FROM matches
            order by householdId desc
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

/** A [findPotentialDuplicates] input: one household member's name and birth date to check. */
@ExcludeFromTestCoverage
data class PersonNameAndBirthDate(
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
)

@ExcludeFromTestCoverage
data class HouseholdDuplicateCandidateRow(
    val householdId: Long,
    val firstname: String,
    val lastname: String,
)

/** A [findPotentialDuplicates] result: an already-registered household with a matching person. */
@ExcludeFromTestCoverage
data class HouseholdDuplicateCandidate(
    val householdId: Long,
    val personName: String,
)

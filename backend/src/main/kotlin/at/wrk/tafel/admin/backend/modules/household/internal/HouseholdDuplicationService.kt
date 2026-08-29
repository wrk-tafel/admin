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
    private val auditLogWriter: AuditLogWriter,
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

        // Same fuzzy name+address rules as MAIN_PERSON_CTE/DUPLICATE_CONDITIONS, but parameterized
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
              AND soundex(p.lastname) = soundex(?::text)
              AND soundex(p.firstname) = soundex(?::text)
              AND levenshtein(lower(concat(p.firstname, p.lastname)), lower(concat(?::text, ?::text))) < 4
              AND levenshtein(
                          lower(concat(h.address_street, h.address_housenumber, h.address_door)),
                          lower(concat(?::text, ?::text, ?::text))
                  ) < 10
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
              AND soundex(p.lastname) = soundex(?::text)
              AND soundex(p.firstname) = soundex(?::text)
              AND levenshtein(lower(concat(p.firstname, p.lastname)), lower(concat(?::text, ?::text))) < 4
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
            mainPersonLastname,
            mainPersonFirstname,
            mainPersonFirstname,
            mainPersonLastname,
            addressStreet,
            addressHouseNumber,
            addressDoor,
        ).toList()

        val personMatches = persons.flatMap { person ->
            jdbcTemplate.query(
                PERSON_SIMILARITY_SQL,
                DataClassRowMapper(HouseholdDuplicateCandidateRow::class.java),
                excludeHouseholdId,
                excludeHouseholdId,
                person.birthDate,
                person.lastname,
                person.firstname,
                person.firstname,
                person.lastname,
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

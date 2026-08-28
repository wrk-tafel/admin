package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Join
import jakarta.persistence.criteria.JoinType
import jakarta.persistence.criteria.Root
import jakarta.persistence.criteria.Subquery
import org.springframework.data.jpa.domain.Specification
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period

/**
 * The "case" record - business number, address, contact data, validity/lock/cost-contribution state
 * and the issuing employee. The people belonging to it live in [PersonEntity]; exactly one of them
 * is the main person, pointed at by [mainPerson].
 *
 * Note: `main_person_id` is intentionally nullable at the schema level. `households` and `persons`
 * reference each other, so a brand-new household + its main person can never be inserted if both
 * directions were `NOT NULL`. New households are therefore always persisted in two steps
 * (household with `mainPerson = null` -> persons -> set `mainPerson`), see `HouseholdService`.
 */
@Entity(name = "Household")
@Table(name = "households")
@ExcludeFromTestCoverage
class HouseholdEntity(
    @Column(name = "household_id")
    var householdId: Long,
    @Column(name = "valid_until")
    var validUntil: LocalDate,
    @Column(name = "locked")
    var locked: Boolean = false,
) : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "employee_id")
    var issuer: EmployeeEntity? = null

    @OneToOne
    @JoinColumn(name = "main_person_id")
    var mainPerson: PersonEntity? = null

    @Column(name = "address_street")
    var addressStreet: String? = null

    @Column(name = "address_housenumber")
    var addressHouseNumber: String? = null

    @Column(name = "address_stairway")
    var addressStairway: String? = null

    @Column(name = "address_postalcode")
    var addressPostalCode: Int? = null

    @Column(name = "address_door")
    var addressDoor: String? = null

    @Column(name = "address_city")
    var addressCity: String? = null

    @Column(name = "telephone_number")
    var telephoneNumber: String? = null

    @Column(name = "email")
    var email: String? = null

    @Column(name = "locked_at")
    var lockedAt: LocalDateTime? = null

    @Column(name = "prolonged_at")
    var prolongedAt: LocalDateTime? = null

    @ManyToOne
    @JoinColumn(name = "locked_by")
    var lockedBy: UserEntity? = null

    @Column(name = "lock_reason")
    var lockReason: String? = null

    @Column(name = "pending_cost_contribution")
    var pendingCostContribution: BigDecimal = BigDecimal.ZERO

    @Column(name = "single_parent")
    var singleParent: Boolean = false

    /**
     * Everything the single search box may match a household on - household number, the names of all
     * its members, address, phone number and e-mail - concatenated and lower-cased. Maintained by a
     * database trigger (see `R__00088_fulltext_search.sql`), hence read-only here.
     */
    @Column(name = "search_text", insertable = false, updatable = false)
    var searchText: String? = null

    @OneToMany(mappedBy = "household", cascade = [CascadeType.ALL], orphanRemoval = true)
    var persons: MutableList<PersonEntity> = mutableListOf()

    @OneToMany(mappedBy = "household", cascade = [CascadeType.ALL], orphanRemoval = true)
    var documents: MutableList<DocumentEntity> = mutableListOf()

    /**
     * Unused in application code - notes are created/queried straight through
     * [at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository], never via this
     * collection. It exists so a household delete cascades to its notes through Hibernate (which
     * fires [at.wrk.tafel.admin.backend.database.common.audit.AuditEventListener] for each one) the
     * same way [persons] and [documents] already do, rather than only through the DB's own
     * `on delete cascade` on `household_notes`, which Hibernate never sees.
     */
    @OneToMany(mappedBy = "household", cascade = [CascadeType.ALL], orphanRemoval = true)
    var notes: MutableList<HouseholdNoteEntity> = mutableListOf()

    /**
     * All household members except the main person - the direct equivalent of the former
     * `CustomerEntity.additionalPersons`.
     */
    fun additionalPersons(): List<PersonEntity> = persons.filterNot { it.isMainPerson }

    interface Specs {
        companion object {
            fun searchTextMatches(searchTerm: String?, similarityThreshold: Float): Specification<HouseholdEntity>? = searchTerm?.let {
                Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    SearchTextSpecs.matches(cb, root[SearchTextSpecs.SEARCH_TEXT_ATTRIBUTE], searchTerm, similarityThreshold)
                }
            }

            fun postProcessingNecessary(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                // any person of the household with incomplete master data
                val subQuery: Subquery<Long> = cq!!.subquery(Long::class.java)
                val subRoot: Root<PersonEntity> = subQuery.from(PersonEntity::class.java)
                val subHousehold: Join<PersonEntity, HouseholdEntity> = subRoot.join("household")

                val subBirthDate: Expression<LocalDate> = subRoot["birthDate"]
                val subGender: Expression<Gender> = subRoot["gender"]

                subQuery.select(subHousehold["id"]).distinct(true)
                    .where(
                        cb.or(
                            cb.isNull(subBirthDate),
                            cb.isNull(subGender),
                        ),
                    )

                val mainPerson = root.join<HouseholdEntity, PersonEntity>("mainPerson", JoinType.LEFT)
                val lastname: Expression<String> = mainPerson["lastname"]
                val firstname: Expression<String> = mainPerson["firstname"]
                val birthDate: Expression<LocalDate> = mainPerson["birthDate"]
                val gender: Expression<Gender> = mainPerson["gender"]
                val country: Expression<CountryEntity> = mainPerson["country"]
                val employer: Expression<String> = mainPerson["employer"]

                val addressStreet: Expression<String> = root["addressStreet"]
                val addressHouseNumber: Expression<String> = root["addressHouseNumber"]
                val addressPostalCode: Expression<String> = root["addressPostalCode"]
                val addressCity: Expression<String> = root["addressCity"]
                val id: Expression<Long> = root["id"]

                cb.or(
                    cb.isNull(lastname),
                    cb.isNull(firstname),
                    cb.isNull(birthDate),
                    cb.isNull(gender),
                    cb.isNull(country),
                    cb.isNull(addressStreet),
                    cb.isNull(addressHouseNumber),
                    cb.isNull(addressPostalCode),
                    cb.isNull(addressCity),
                    cb.isNull(employer),
                    id.`in`(subQuery),
                )
            }

            fun pendingCostContribution(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val pendingCostContribution: Expression<BigDecimal> = root["pendingCostContribution"]
                cb.greaterThan(pendingCostContribution, BigDecimal.ZERO)
            }

            /**
             * Best match first while a search term is given, most recently updated first otherwise
             * (a plain filter-only search has no notion of a better hit). Ordering always ends on the
             * id so paging stays stable when two households score - or were updated - identically.
             */
            fun orderBySearchRelevance(searchTerm: String?, spec: Specification<HouseholdEntity>): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val updatedAt: Expression<LocalDate> = root["updatedAt"]
                val id: Expression<Long> = root["id"]

                val orders = buildList {
                    searchTerm?.let {
                        add(cb.desc(SearchTextSpecs.score(cb, root[SearchTextSpecs.SEARCH_TEXT_ATTRIBUTE], it)))
                    }
                    add(cb.desc(updatedAt))
                    add(cb.desc(id))
                }
                cq!!.orderBy(orders)
                spec.toPredicate(root, cq, cb)
            }

            fun validHousehold(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val validUntil: Expression<LocalDate> = root["validUntil"]
                cb.and(
                    cb.isNotNull(validUntil),
                    cb.greaterThanOrEqualTo(validUntil, LocalDate.now()),
                )
            }

            fun lockedHousehold(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val locked: Expression<Boolean> = root["locked"]
                cb.isTrue(locked)
            }

            /**
             * Matches households with no `PRIVACY_NOTICE`-typed document uploaded (see GDPR G2,
             * issue #3177) - not "no consent recorded", since there is no such field anywhere in the
             * application; the uploaded, signed sheet is the only record.
             */
            fun missingPrivacyNoticeDocument(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val subQuery: Subquery<Long> = cq!!.subquery(Long::class.java)
                val subRoot: Root<DocumentEntity> = subQuery.from(DocumentEntity::class.java)
                val subHousehold: Join<DocumentEntity, HouseholdEntity> = subRoot.join("household")
                val documentType: Expression<DocumentType> = subRoot["documentType"]

                subQuery.select(subHousehold["id"]).distinct(true)
                    .where(cb.equal(documentType, DocumentType.PRIVACY_NOTICE))

                val id: Expression<Long> = root["id"]
                cb.not(id.`in`(subQuery))
            }

            /**
             * Matches households `HouseholdRetentionService` will delete within the next [withinDays]
             * days at the job's own [retentionTime] window (GDPR gap G1/G18) - the customer-search
             * counterpart to the job's cutoff, so an upcoming deletion is visible on this screen
             * before it happens rather than only in the "Verlauf" tab afterwards. A zero or negative
             * [retentionTime] means the job is disabled and nothing will ever be swept, so nothing
             * matches.
             */
            fun willBeDeletedSoon(retentionTime: Period, withinDays: Long): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                if (retentionTime.isZero || retentionTime.isNegative) {
                    cb.disjunction()
                } else {
                    val validUntil: Expression<LocalDate> = root["validUntil"]
                    val cutoff = LocalDate.now().minus(retentionTime)
                    cb.and(
                        cb.isNotNull(validUntil),
                        cb.greaterThanOrEqualTo(validUntil, cutoff),
                        cb.lessThan(validUntil, cutoff.plusDays(withinDays)),
                    )
                }
            }

            /**
             * Matches households with an uploaded `PRIVACY_NOTICE` document whose stamped
             * [DocumentEntity.retentionPeriodAtUpload] no longer matches [currentRetentionTime] - the
             * live config has moved since the document was printed and signed (issue #3500, follow-up
             * to GDPR gap G22). Compared as [Period.toString]'s canonical ISO-8601 text, same as the
             * value is stamped with - a raw text comparison, not a semantic "same duration" one, same
             * as every other retention comparison in this application takes the configured value as-is
             * rather than normalizing it. A document uploaded before that field existed has a `null`
             * stamp and never matches - it predates the ability to tell. A zero or negative
             * [currentRetentionTime] means the retention job is disabled, so there is no live window to
             * have drifted from and nothing matches, same short-circuit as [willBeDeletedSoon].
             */
            fun privacyNoticeRetentionDrift(currentRetentionTime: Period): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                if (currentRetentionTime.isZero || currentRetentionTime.isNegative) {
                    cb.disjunction()
                } else {
                    val subQuery: Subquery<Long> = cq!!.subquery(Long::class.java)
                    val subRoot: Root<DocumentEntity> = subQuery.from(DocumentEntity::class.java)
                    val subHousehold: Join<DocumentEntity, HouseholdEntity> = subRoot.join("household")
                    val documentType: Expression<DocumentType> = subRoot["documentType"]
                    val retentionPeriodAtUpload: Expression<String> = subRoot["retentionPeriodAtUpload"]

                    subQuery.select(subHousehold["id"]).distinct(true)
                        .where(
                            cb.and(
                                cb.equal(documentType, DocumentType.PRIVACY_NOTICE),
                                cb.isNotNull(retentionPeriodAtUpload),
                                cb.notEqual(retentionPeriodAtUpload, currentRetentionTime.toString()),
                            ),
                        )

                    val id: Expression<Long> = root["id"]
                    id.`in`(subQuery)
                }
            }
        }
    }
}

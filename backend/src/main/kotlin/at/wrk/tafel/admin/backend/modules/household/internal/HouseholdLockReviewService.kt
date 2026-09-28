package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.lockReviewDue
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.lockedHousehold
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.openEndedLock
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdLockReason
import at.wrk.tafel.admin.backend.modules.household.LockedHouseholdItem
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

/**
 * The review of household locks that have no `lockedUntil` date (issue #3763, GDPR Art. 5(1)(e)): the
 * "Gesperrte Kunden" list and the "reviewed, the lock stays" confirmation that restarts a lock's
 * review interval. The reminder that tells staff a review is due is `push`'s
 * `HouseholdLockReviewReminderService`; lifting a lock goes through the ordinary household update,
 * and a temporary one lifts itself ([HouseholdLockExpiryService]).
 *
 * A lock is due once its last review - or, never reviewed, the lock itself - is older than
 * `tafeladmin.householdLockReview.interval`, read per call.
 */
@Service
class HouseholdLockReviewService(
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
    private val tafelAdminProperties: TafelAdminProperties,
    private val auditLogWriter: AuditLogWriter,
    private val clock: Clock,
) {
    /**
     * The moment a lock's reference date has to be older than to be due, or `null` while the review
     * is switched off (kill switch, or a zero/negative interval) - nothing is due then.
     */
    fun dueCutoff(): LocalDateTime? {
        val config = tafelAdminProperties.householdLockReview
        if (!config.enabled || config.interval.isZero || config.interval.isNegative) {
            return null
        }
        return LocalDateTime.now(clock).minus(config.interval)
    }

    /**
     * Every locked household, or only the open-ended ([openEndedOnly]) / due ([dueOnly]) ones, the
     * ones waiting longest for a look first. Sorted and sliced in memory rather than in SQL - the
     * order is by the last review *or*, never reviewed, the lock date, which has no sort column, and
     * the number of locked households is small next to the rest of the register.
     *
     * Not read-only: every call records an `AuditOperation.READ` (GDPR G24) - the response names
     * every locked household, not one.
     */
    @Transactional
    fun getLockedHouseholds(
        page: Int?,
        pageSize: Int?,
        openEndedOnly: Boolean,
        dueOnly: Boolean,
    ): LockedHouseholdSearchResult {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.LOCKED_HOUSEHOLDS_ENTITY_TYPE,
                entityId = null,
                businessKey = listOfNotNull(
                    "openEndedOnly=true".takeIf { openEndedOnly },
                    "dueOnly=true".takeIf { dueOnly },
                ).joinToString(";").ifEmpty { null },
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )

        val cutoff = dueCutoff()
        val spec: Specification<HouseholdEntity> = when {
            // switched off: nothing is due, so the "due" view is empty rather than everything
            dueOnly && cutoff == null -> Specification { _, _, cb -> cb.disjunction() }
            dueOnly -> lockReviewDue(cutoff!!)
            openEndedOnly -> openEndedLock()
            else -> lockedHousehold()
        }
        val households = householdRepository.findAll(spec)
            .sortedWith(compareBy<HouseholdEntity> { it.reviewReference() }.thenBy { it.householdId })

        val pageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), PaginationDefaults.resolvePageSize(pageSize))
        val fromIndex = pageRequest.offset.toInt().coerceAtMost(households.size)
        val toIndex = (fromIndex + pageRequest.pageSize).coerceAtMost(households.size)
        val paged = PageImpl(households.subList(fromIndex, toIndex).map { it.toItem(cutoff) }, pageRequest, households.size.toLong())

        return LockedHouseholdSearchResult(
            items = paged.content,
            totalCount = paged.totalElements,
            currentPage = page ?: 1,
            totalPages = paged.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * "Reviewed, the lock stays": stamps [HouseholdEntity.lockReviewedAt]/`lockReviewedBy`, which
     * restarts the interval. The change is audited like any other household update, so who confirmed
     * a lock and when stays in the household's history.
     */
    @Transactional
    fun confirmLockReview(householdId: Long, username: String): LockedHouseholdItem {
        val household = householdRepository.findByHouseholdId(householdId)
            ?: throw NotFoundException("Kunde nicht gefunden")
        if (!household.locked) {
            throw BusinessRuleException("Kunde ist nicht gesperrt")
        }

        household.lockReviewedAt = LocalDateTime.now(clock)
        household.lockReviewedBy = userRepository.findByUsername(username)
        val saved = householdRepository.save(household)
        return saved.toItem(dueCutoff())
    }

    private fun HouseholdEntity.reviewReference(): LocalDateTime = lockReviewedAt ?: lockedAt ?: LocalDateTime.MIN

    private fun HouseholdEntity.toItem(cutoff: LocalDateTime?): LockedHouseholdItem {
        val main = mainPerson
        val reference = lockReviewedAt ?: lockedAt
        return LockedHouseholdItem(
            householdId = householdId,
            name = listOfNotNull(main?.lastname, main?.firstname).joinToString(" ").ifBlank { null },
            lockedAt = lockedAt,
            lockedBy = lockedBy?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" },
            lockReasonType = lockReasonType?.let { HouseholdLockReason.valueOf(it.name) },
            lockReason = lockReason,
            lockedUntil = lockedUntil,
            lockReviewedAt = lockReviewedAt,
            lockReviewedBy = lockReviewedBy?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" },
            reviewDue = lockedUntil == null && cutoff != null && (reference == null || reference.isBefore(cutoff)),
        )
    }
}

data class LockedHouseholdSearchResult(
    val items: List<LockedHouseholdItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdLockRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import at.wrk.tafel.admin.backend.database.model.household.HouseholdLockReason as HouseholdLockReasonEntity

/**
 * Locking and unlocking a household by hand - the customer detail screen's "Sperren"/"Entsperren".
 *
 * Both write the lock fields of the stored household and nothing else, so neither takes the
 * household itself as input. A household may be incomplete on purpose (see the module README): a
 * lock that had to submit the whole record would be refused by the required-field validation of
 * exactly the households that cannot be completed, and would re-run an income check that has nothing
 * to do with a lock.
 */
@Service
class HouseholdLockService(
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
    private val householdConverter: HouseholdConverter,
    private val clock: Clock,
) {

    companion object {
        private val log = LoggerFactory.getLogger(HouseholdLockService::class.java)
    }

    /**
     * There is no "edit an existing lock" action, only lock/unlock - an already locked household is
     * refused rather than silently re-stamped with a new "Gesperrt seit/von".
     */
    @Transactional
    fun lockHousehold(householdId: Long, request: HouseholdLockRequest, username: String): HouseholdResponse {
        val household = householdRepository.findByHouseholdId(householdId)
            ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
        if (household.locked) {
            throw BusinessRuleException("Kunde ist bereits gesperrt!")
        }

        household.locked = true
        household.lockedAt = LocalDateTime.now(clock)
        household.lockedBy = userRepository.findByUsername(username)
        household.lockReason = request.lockReason?.trim()
        household.lockReasonType = request.lockReasonType?.let { HouseholdLockReasonEntity.valueOf(it.name) }
        household.lockedUntil = request.lockedUntil

        val savedEntity = householdRepository.saveAndFlush(household)
        log.info("Locked household {}", householdId)
        return householdConverter.mapEntityToHousehold(savedEntity)
    }

    @Transactional
    fun unlockHousehold(householdId: Long): HouseholdResponse {
        val household = householdRepository.findByHouseholdId(householdId)
            ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")

        household.locked = false
        household.lockedAt = null
        household.lockedBy = null
        household.lockReason = null
        household.lockReasonType = null
        household.lockedUntil = null
        household.lockReviewedAt = null
        household.lockReviewedBy = null

        val savedEntity = householdRepository.saveAndFlush(household)
        log.info("Unlocked household {}", householdId)
        return householdConverter.mapEntityToHousehold(savedEntity)
    }
}

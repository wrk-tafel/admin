package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * Lifts a temporary lock (issue #3753) once its expiration date
 * ([at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.lockedUntil]) has passed -
 * the counterpart to a lock set with no expiration date, which stays until a staff member unlocks it
 * by hand.
 *
 * Candidate ids are selected and locked (`FOR UPDATE SKIP LOCKED`, see
 * [HouseholdRepository.findHouseholdIdsWithExpiredLockSkipLocked]) inside the same transaction that
 * then unlocks each of them, so a second instance's run skips a household this one already claimed
 * rather than racing it (ADR-0047).
 *
 * Runs at 05:50, just before [HouseholdRetentionService] at 06:00 - so a household whose temporary
 * lock and `validUntil` have both expired is already unlocked by the time that job decides whether a
 * [at.wrk.tafel.admin.backend.database.model.household.HouseholdLockReason.BANNED_FROM_PREMISES] lock
 * should keep it around longer.
 */
@Service
class HouseholdLockExpiryService(
    private val householdRepository: HouseholdRepository,
    private val householdService: HouseholdService,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(HouseholdLockExpiryService::class.java)
    }

    /**
     * The schedule is a plain placeholder rather than a `TafelAdminProperties` field, for the same
     * reason as `tafeladmin.audit.cleanupCron`: `@Scheduled` fixes the expression when the bean is
     * created, so a reloaded value could never take effect. Changing it needs a restart.
     */
    @Scheduled(cron = "\${tafeladmin.householdLockExpiry.cron:0 50 5 * * *}")
    @Transactional
    fun unlockExpiredLocks() {
        val today = LocalDate.now(clock)
        val expiredLockHouseholdIds = householdRepository.findHouseholdIdsWithExpiredLockSkipLocked(today)
        if (expiredLockHouseholdIds.isEmpty()) {
            return
        }

        expiredLockHouseholdIds.forEach { householdService.unlockHouseholdByHouseholdId(it) }
        logger.info(
            "Lifted the temporary lock on {} household(s) whose lockedUntil was before {}",
            expiredLockHouseholdIds.size,
            today,
        )
    }
}

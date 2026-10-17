package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * The category of a household lock (issue #3753) - always alongside the free-text reason
 * ([HouseholdEntity.lockReason]), never instead of it. Every lock set or edited by hand has to pick
 * one (`HouseholdLockRequest`), [OTHER] when none of the others fits; [HouseholdEntity.lockReasonType]
 * is nullable only because a household that is not locked has none. German labels for these (e.g.
 * [BANNED_FROM_PREMISES] as "Hausverbot") are a frontend-only concern.
 *
 * [BANNED_FROM_PREMISES] is the one reason `HouseholdRetentionService` treats specially: a
 * household locked for it is never swept by the nightly deletion job regardless of `validUntil`, so
 * the record is kept around for as long as the lock itself lasts.
 */
@ExcludeFromTestCoverage
enum class HouseholdLockReason {
    BANNED_FROM_PREMISES,
    CODE_OF_CONDUCT_VIOLATION,
    MISUSE_OF_SERVICES,
    OTHER,
}

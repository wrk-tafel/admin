package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * A handful of common categories a household lock's reason can be tagged with (issue #3753) - always
 * alongside the actual, always-required free-text reason ([HouseholdEntity.lockReason]), never
 * instead of it: this is a convenience tag, not an exhaustive enumeration a caller must pick from, so
 * [HouseholdEntity.lockReasonType] stays nullable even for a locked household. [OTHER] is the default
 * a caller picks when none of the other tags fits. German labels for these (e.g.
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

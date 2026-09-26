package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDate
import java.time.LocalDateTime

/*
 * What the retention jobs will delete soon, one paged list per kind of record - the same set the daily
 * "Daten werden bald gelöscht" push notification counts (`RetentionExpiryReminderService`). Each list
 * comes from its own endpoint and only for a caller holding the permission of its area
 * (`USER_MANAGEMENT` for user accounts, `CUSTOMER` for households, `SETTINGS` for employees), so the
 * screen never shows a name its viewer couldn't otherwise reach.
 *
 * Every list carries the same envelope: [enabled] is false when the job is switched off
 * (`enabled: false` or a retention time of zero or less), in which case nothing is listed.
 * `retentionText` and `warningText` are the configured windows as German dative text ("1 Jahr",
 * "30 Tagen") for a sentence like "nach ... ohne Anmeldung". The paging fields mirror `PagedResponse`,
 * oldest activity first.
 */

@ExcludeFromTestCoverage
data class PendingUserDeletionListResponse(
    val enabled: Boolean,
    val retentionText: String,
    val warningText: String,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
    val items: List<PendingUserDeletionItem>,
)

/** [lastLogin] is `null` for an account that never logged in, which is then measured from [createdAt]. */
@ExcludeFromTestCoverage
data class PendingUserDeletionItem(
    val id: Long,
    val username: String,
    val firstname: String,
    val lastname: String,
    val personnelNumber: String,
    val lastLogin: LocalDateTime?,
    val createdAt: LocalDateTime,
    val deletionDate: LocalDate,
)

@ExcludeFromTestCoverage
data class PendingHouseholdDeletionListResponse(
    val enabled: Boolean,
    val retentionText: String,
    val warningText: String,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
    val items: List<PendingHouseholdDeletionItem>,
)

/** [name] is the main person, `null` when the household has none. */
@ExcludeFromTestCoverage
data class PendingHouseholdDeletionItem(
    val householdId: Long,
    val name: String?,
    val validUntil: LocalDate,
    val deletionDate: LocalDate,
)

@ExcludeFromTestCoverage
data class PendingEmployeeDeletionListResponse(
    val enabled: Boolean,
    val retentionText: String,
    val warningText: String,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
    val items: List<PendingEmployeeDeletionItem>,
)

/** [lastUsed] is the newest food collection naming the employee, `null` when none ever did - then [createdAt] counts. */
@ExcludeFromTestCoverage
data class PendingEmployeeDeletionItem(
    val id: Long,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
    val lastUsed: LocalDateTime?,
    val createdAt: LocalDateTime,
    val deletionDate: LocalDate,
)

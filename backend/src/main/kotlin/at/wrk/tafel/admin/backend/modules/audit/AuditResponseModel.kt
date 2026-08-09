package at.wrk.tafel.admin.backend.modules.audit

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import java.time.LocalDateTime

/**
 * One recorded change, as the frontend renders it.
 *
 * [changes] is the `changed_fields` document expanded into a list so the UI can lay it out as a
 * table without knowing the JSON shape; [oldValue]/[newValue] are already strings because a value's
 * original type says nothing useful once it is being displayed next to a different one.
 */
@ExcludeFromTestCoverage
data class AuditEntryItem(
    val id: Long,
    val occurredAt: LocalDateTime,
    val actorUsername: String?,
    val entityType: String,
    val entityId: Long?,
    val businessKey: String?,
    val operation: AuditOperation,
    val changes: List<AuditFieldChangeItem>,
)

@ExcludeFromTestCoverage
data class AuditFieldChangeItem(
    val field: String,
    val oldValue: String?,
    val newValue: String?,
)

/**
 * The values the administration screen's filter dropdowns offer. Served from the backend rather
 * than hard-coded in the frontend so adding an entity to `AuditScope` shows up in the UI without a
 * second edit.
 */
@ExcludeFromTestCoverage
data class AuditFilterOptionsResponse(
    val entityTypes: List<String>,
    val operations: List<AuditOperation>,
)

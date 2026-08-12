package at.wrk.tafel.admin.backend.modules.audit

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * One recorded change, as the frontend renders it.
 *
 * [changes] is the `changed_fields` document expanded into a list so the UI can lay it out as a
 * table without knowing the JSON shape; [oldValue]/[newValue] are already strings because a value's
 * original type says nothing useful once it is being displayed next to a different one.
 *
 * [actorFirstname]/[actorLastname] are served next to the username rather than merged into it: the
 * username is what identifies the account and what the filter matches on, the name is who that is.
 * Either can be absent - see `AuditLogEntity`.
 */
@ExcludeFromTestCoverage
data class AuditEntryItem(
    val id: Long,
    val occurredAt: LocalDateTime,
    val actorUsername: String?,
    val actorFirstname: String?,
    val actorLastname: String?,
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
 * What the administration screen narrows the log by. One value rather than six parameters: they are
 * only ever passed together, straight from the query string to the specification that reads them.
 *
 * Not a `Request` despite naming a controller parameter list - it is bound from query parameters,
 * never from a request body, so the suffix convention in CLAUDE.md does not apply.
 */
@ExcludeFromTestCoverage
data class AuditSearchFilter(
    val entityType: String? = null,
    val operation: AuditOperation? = null,
    val actorUsername: String? = null,
    val businessKey: String? = null,
    val from: LocalDate? = null,
    val to: LocalDate? = null,
)

/**
 * The values the administration screen's filter dropdowns offer. Served from the backend rather
 * than hard-coded in the frontend so adding an entity to `AuditScope` shows up in the UI without a
 * second edit.
 *
 * [actors] is what turns the actor filter from free text into a choice: the filter matches the
 * username exactly, so a typo used to return an empty list that reads like "nothing was changed" -
 * the one misreading an audit screen must not invite.
 */
@ExcludeFromTestCoverage
data class AuditFilterOptionsResponse(
    val entityTypes: List<String>,
    val operations: List<AuditOperation>,
    val actors: List<AuditActorItem>,
)

/**
 * A user the log holds entries for. Carries the name next to the username for the same reason
 * [AuditEntryItem] does: the username is what the filter matches, the name is who that is.
 */
@ExcludeFromTestCoverage
data class AuditActorItem(
    val username: String,
    val firstname: String?,
    val lastname: String?,
)

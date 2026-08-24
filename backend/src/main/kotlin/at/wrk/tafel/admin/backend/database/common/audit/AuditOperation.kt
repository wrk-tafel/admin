package at.wrk.tafel.admin.backend.database.common.audit

/**
 * What kind of change an audit entry records.
 *
 * Lives next to the audit machinery rather than beside `AuditLogEntity` because it is also part of
 * the read API: the controller accepts it as a filter and returns it, and controllers may not depend
 * on `database.model` (see `ProjectSpecificRulesTest`).
 */
enum class AuditOperation {
    INSERT,
    UPDATE,
    DELETE,

    /** A successful login - see [AuditScope.USER_LOGIN_ENTITY_TYPE]. */
    LOGIN,

    /**
     * A read of something sensitive enough to be worth recording on its own - a document download,
     * a household PDF export, a distribution's customer list export. Written explicitly by the
     * controller-level action, the same way [AuditLogWriter.record] is used for any other write
     * Hibernate's events cannot see - a read never reaches those events at all. [AuditLogWriter]'s
     * `changedFields` is left empty for these: a diff has no meaning for something that changed
     * nothing.
     */
    READ,
}

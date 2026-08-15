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
}

package at.wrk.tafel.admin.backend.database.common.audit

import org.hibernate.Interceptor
import org.hibernate.type.Type
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider

/**
 * Arms [AuditLogWriter] as soon as the session touches anything, rather than leaving it to arm
 * itself when the first *audited* change shows up.
 *
 * That distinction is the whole point of this class. Entries are written from a `beforeCommit`
 * synchronization, and Spring runs those *before* Hibernate's commit-time flush. A write path that
 * never flushes early - `repository.save(...)` whose only transaction is the repository's own, as
 * `HouseholdNoteService.createNewNote` has - therefore raises its post-insert event during that
 * final flush, by which point a synchronization registered on the first event would be too late to
 * run: the change was buffered into something nothing ever drained, and vanished silently.
 *
 * Registering up front means `beforeCommit` always runs, and it is what forces the flush that makes
 * the buffer complete before it is written.
 *
 * These two hooks are the earliest ones reliably inside a Spring-managed transaction, and between
 * them they cover every audited change: [onLoad] catches read-then-modify and read-then-delete,
 * [onPersist] a brand-new entity. `afterTransactionBegin` is *not* usable - `JpaTransactionManager`
 * begins the Hibernate transaction before it activates synchronization, so arming there always
 * finds none active and does nothing.
 *
 * The writer is resolved per call through an [ObjectProvider]: this interceptor is handed to
 * Hibernate while the `EntityManagerFactory` is still being built, and the writer needs a repository
 * that needs that same factory.
 */
class AuditTransactionInterceptor(
    private val auditLogWriter: ObjectProvider<AuditLogWriter>,
) : Interceptor {

    companion object {
        private val logger = LoggerFactory.getLogger(AuditTransactionInterceptor::class.java)
    }

    override fun onLoad(entity: Any?, id: Any?, state: Array<Any?>?, propertyNames: Array<String>?, types: Array<Type>?): Boolean = armOn("load")

    override fun onPersist(entity: Any?, id: Any?, state: Array<Any?>?, propertyNames: Array<String>?, types: Array<Type>?): Boolean = armOn("persist")

    /**
     * Never allowed to throw: this runs inside Hibernate's own callbacks, where an exception would
     * take down the business transaction that triggered it. [trigger] names the hook so a failure
     * says which one it came from - the two differ in nothing else.
     *
     * @return false - the entity's state is left exactly as Hibernate handed it over.
     */
    private fun armOn(trigger: String): Boolean {
        runCatching { auditLogWriter.getObject().armForCurrentTransaction() }
            .onFailure { logger.error("Could not arm the audit trail for this transaction (on {})", trigger, it) }
        return false
    }
}

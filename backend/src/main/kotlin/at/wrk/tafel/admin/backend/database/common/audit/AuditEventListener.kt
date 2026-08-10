package at.wrk.tafel.admin.backend.database.common.audit

import org.hibernate.event.spi.PostDeleteEvent
import org.hibernate.event.spi.PostDeleteEventListener
import org.hibernate.event.spi.PostInsertEvent
import org.hibernate.event.spi.PostInsertEventListener
import org.hibernate.event.spi.PostUpdateEvent
import org.hibernate.event.spi.PostUpdateEventListener
import org.hibernate.persister.entity.EntityPersister
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * Turns Hibernate's flush-time events into audit entries.
 *
 * Registered against the session factory by [AuditListenerRegistrar]. Post-*insert/update/delete*
 * rather than the pre-* variants because those fire for statements Hibernate may still decide not
 * to execute; by the time these run, the statement has gone to the database - it just hasn't been
 * committed yet, which is why the entry is buffered rather than written here (see [AuditLogWriter]).
 *
 * Nothing in here may throw: an exception raised inside a flush listener aborts the business
 * transaction that triggered it. Failing to record a change is bad; refusing to save a household
 * because recording failed is worse.
 */
@Component
class AuditEventListener(
    private val auditLogWriter: AuditLogWriter,
) : PostInsertEventListener,
    PostUpdateEventListener,
    PostDeleteEventListener {

    companion object {
        private val logger = LoggerFactory.getLogger(AuditEventListener::class.java)
    }

    override fun onPostInsert(event: PostInsertEvent) {
        val audited = AuditScope.of(event.persister.mappedClass) ?: return
        safely(audited.entityType) {
            auditLogWriter.bufferFromListener(
                AuditLogWriter.PendingEntry(
                    entityType = audited.entityType,
                    entityId = event.id as? Long,
                    businessKey = businessKeyOf(audited, event.entity),
                    operation = AuditOperation.INSERT,
                    changedFields = AuditFieldDiff.forInsert(
                        event.persister.propertyNames,
                        event.state,
                        audited.redactedFields,
                    ),
                ),
            )
        }
    }

    override fun onPostUpdate(event: PostUpdateEvent) {
        val audited = AuditScope.of(event.persister.mappedClass) ?: return
        safely(audited.entityType) {
            auditLogWriter.bufferFromListener(
                AuditLogWriter.PendingEntry(
                    entityType = audited.entityType,
                    entityId = event.id as? Long,
                    businessKey = businessKeyOf(audited, event.entity),
                    operation = AuditOperation.UPDATE,
                    changedFields = AuditFieldDiff.forUpdate(
                        event.persister.propertyNames,
                        event.oldState,
                        event.state,
                        event.dirtyProperties,
                        audited.redactedFields,
                    ),
                ),
            )
        }
    }

    override fun onPostDelete(event: PostDeleteEvent) {
        val audited = AuditScope.of(event.persister.mappedClass) ?: return
        safely(audited.entityType) {
            auditLogWriter.bufferFromListener(
                AuditLogWriter.PendingEntry(
                    entityType = audited.entityType,
                    entityId = event.id as? Long,
                    businessKey = businessKeyOf(audited, event.entity),
                    operation = AuditOperation.DELETE,
                    changedFields = AuditFieldDiff.forDelete(
                        event.persister.propertyNames,
                        event.deletedState,
                        audited.redactedFields,
                    ),
                ),
            )
        }
    }

    /**
     * Hibernate calls the listener again after the transaction commits when this is true. It isn't:
     * entries are collected during the flush and written by the same transaction that made the
     * change, so a post-commit callback would be a second, redundant pass.
     */
    override fun requiresPostCommitHandling(persister: EntityPersister): Boolean = false

    /**
     * Reading the key can mean walking into an association - for a person that is its household -
     * which may be an uninitialized proxy pointing at a row a cascade has just deleted. An entry
     * without a business key is still worth having, so a failure here costs the key, not the entry.
     */
    private fun businessKeyOf(audited: AuditScope.AuditedEntity, entity: Any?): String? {
        if (entity == null) {
            return null
        }
        return runCatching { audited.businessKey(entity) }
            .onFailure { logger.debug("Could not resolve the business key of an audited {}", audited.entityType, it) }
            .getOrNull()
    }

    private fun safely(entityType: String, block: () -> Unit) {
        runCatching(block)
            .onFailure { logger.error("Failed to record an audit entry for {}", entityType, it) }
    }
}

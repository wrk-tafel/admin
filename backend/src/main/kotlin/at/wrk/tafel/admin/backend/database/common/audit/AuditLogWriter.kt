package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.LocalDateTime

/**
 * Collects the changes made in a transaction and writes them to `audit_log` just before it commits.
 *
 * Two things follow from writing at commit rather than as each change happens:
 *
 * - A rolled-back transaction logs nothing. `beforeCommit` simply never runs, so the log can never
 *   claim a change that the database does not actually hold.
 * - The acting user is resolved once, from the `SecurityContext` of the thread that made the
 *   changes, instead of once per row.
 *
 * The entries themselves come from [AuditEventListener] (Hibernate's post-insert/update/delete
 * events) for anything written through the session, and from [record] for the write paths that go
 * around it - bulk `@Modifying` queries and native SQL never reach a Hibernate event, so those
 * callers have to say what they did. That gap is real and is the price of not using database
 * triggers; see ADR-0038.
 */
@Component
class AuditLogWriter(
    private val auditLogRepository: AuditLogRepository,
    private val userRepository: UserRepository,
    private val auditActorProvider: AuditActorProvider,
    private val jsonMapper: JsonMapper,
    private val properties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AuditLogWriter::class.java)
        private const val BUFFER_RESOURCE_KEY = "at.wrk.tafel.admin.audit.buffer"
    }

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    /**
     * One change, not yet written. [changedFields] is already rendered - holding on to the live
     * entity instead would mean reading it again at commit time, by which point it may have moved on
     * or, for a delete, be gone.
     */
    data class PendingEntry(
        val entityType: String,
        val entityId: Long?,
        val businessKey: String?,
        val operation: AuditOperation,
        val changedFields: Map<String, List<Any?>>,
    )

    /**
     * For the write paths Hibernate's events cannot see - bulk `@Modifying` updates, native queries
     * and anything else that changes rows without loading them. Buffered exactly like a listener
     * entry, so it lands in the same transaction's batch and disappears with it on a rollback.
     */
    fun record(entry: PendingEntry) {
        if (!properties.audit.enabled) {
            return
        }
        buffer(entry)
    }

    internal fun bufferFromListener(entry: PendingEntry) {
        if (!properties.audit.enabled) {
            return
        }
        // A change that touched nothing loggable (only createdAt/updatedAt, or only a collection)
        // would otherwise produce an entry saying nothing happened.
        if (entry.operation == AuditOperation.UPDATE && entry.changedFields.isEmpty()) {
            return
        }
        buffer(entry)
    }

    private fun buffer(entry: PendingEntry) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // Nothing to hang the write off: without a transaction there is no commit to write at,
            // and writing immediately would log a change that may still fail. Loud on purpose -
            // every application write path runs in a transaction, so this means a new one doesn't.
            logger.warn(
                "Dropping audit entry for {} {} - no active transaction synchronization",
                entry.entityType,
                entry.entityId,
            )
            return
        }

        val existingBuffer = currentBuffer()
        if (existingBuffer != null) {
            existingBuffer.add(entry)
            return
        }

        val buffer = mutableListOf(entry)
        TransactionSynchronizationManager.bindResource(BUFFER_RESOURCE_KEY, buffer)
        TransactionSynchronizationManager.registerSynchronization(AuditFlushSynchronization())
    }

    @Suppress("UNCHECKED_CAST")
    private fun currentBuffer(): MutableList<PendingEntry>? = TransactionSynchronizationManager.getResource(BUFFER_RESOURCE_KEY) as MutableList<PendingEntry>?

    private inner class AuditFlushSynchronization : TransactionSynchronization {

        override fun beforeCommit(readOnly: Boolean) {
            if (readOnly) {
                return
            }
            writeBufferedEntries()
        }

        override fun afterCompletion(status: Int) {
            TransactionSynchronizationManager.unbindResourceIfPossible(BUFFER_RESOURCE_KEY)
        }
    }

    /**
     * Deliberately not called `flush`: [TransactionSynchronization] declares a `flush()` of its own,
     * so an unqualified call from inside [AuditFlushSynchronization] would silently resolve to that
     * no-op default instead of this method - and every entry would be collected and then dropped.
     */
    private fun writeBufferedEntries() {
        val buffer = currentBuffer()?.takeIf { it.isNotEmpty() } ?: return

        // Flush the session first: `beforeCommit` runs *before* Hibernate's own commit-time flush,
        // so an entity modified in this transaction but not yet written would raise its
        // post-update event after this method had already finished, and its change would be lost.
        // Forcing the flush here is what makes the buffer complete rather than "complete so far".
        runCatching { entityManager.flush() }
            .onFailure { logger.debug("Could not flush the persistence context before writing audit entries", it) }

        // Resolved once per transaction rather than per entry. Deliberately before the buffer is
        // snapshotted: this query can itself trigger an auto-flush, and anything that flush adds to
        // the buffer belongs in this batch.
        val actorUsername = auditActorProvider.currentUsername()
        val actorUserId = actorUsername?.let { userRepository.findByUsername(it)?.id }

        val entries = buffer.toList()
        buffer.clear()

        val occurredAt = LocalDateTime.now(clock)
        auditLogRepository.saveAll(
            entries.map { entry -> toEntity(entry, occurredAt, actorUsername, actorUserId) },
        )
    }

    private fun toEntity(
        entry: PendingEntry,
        occurredAt: LocalDateTime,
        actorUsername: String?,
        actorUserId: Long?,
    ): AuditLogEntity {
        val entity = AuditLogEntity(
            occurredAt = occurredAt,
            entityType = entry.entityType,
            operation = entry.operation,
        )
        entity.entityId = entry.entityId
        entity.businessKey = entry.businessKey
        entity.actorUsername = actorUsername
        entity.actorUserId = actorUserId
        entity.changedFields = entry.changedFields.takeIf { it.isNotEmpty() }?.let { jsonMapper.writeValueAsString(it) }
        return entity
    }
}

package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import org.hibernate.proxy.HibernateProxy
import java.time.temporal.Temporal

/**
 * Turns Hibernate's flat state arrays into the `{"field": [old, new]}` shape stored in
 * `audit_log.changed_fields`.
 *
 * Pure functions over plain arrays on purpose: this is the part of the audit trail most likely to
 * be wrong in a way nobody notices, and keeping Hibernate's `EntityPersister`/`Session` out of it
 * is what makes it testable without a database.
 */
object AuditFieldDiff {

    private const val REDACTED = "***"

    fun forInsert(propertyNames: Array<String>, state: Array<Any?>?, redactedFields: Set<String>): Map<String, List<Any?>> = propertyNames.indices
        .filter { isLoggable(propertyNames[it], state?.getOrNull(it)) }
        .filter { state?.getOrNull(it) != null }
        .associate { propertyNames[it] to listOf(null, renderValue(propertyNames[it], state?.getOrNull(it), redactedFields)) }

    fun forDelete(propertyNames: Array<String>, deletedState: Array<Any?>?, redactedFields: Set<String>): Map<String, List<Any?>> = propertyNames.indices
        .filter { isLoggable(propertyNames[it], deletedState?.getOrNull(it)) }
        .filter { deletedState?.getOrNull(it) != null }
        .associate { propertyNames[it] to listOf(renderValue(propertyNames[it], deletedState?.getOrNull(it), redactedFields), null) }

    /**
     * [oldState] is null when the entity was updated without Hibernate having loaded its previous
     * state (a detached instance merged back in). The change is still recorded - losing the entry
     * entirely would be worse - but its old side reads `null`, which is then indistinguishable from
     * a field that genuinely was null before. That is the one lossy case in here.
     *
     * [dirtyProperties] is Hibernate's own dirty-check result; when it is null or empty, the states
     * are compared field by field instead.
     */
    fun forUpdate(
        propertyNames: Array<String>,
        oldState: Array<Any?>?,
        state: Array<Any?>?,
        dirtyProperties: IntArray?,
        redactedFields: Set<String>,
    ): Map<String, List<Any?>> {
        val candidateIndices = dirtyProperties?.toList()?.takeIf { it.isNotEmpty() }
            ?: propertyNames.indices.filter { oldState?.getOrNull(it) != state?.getOrNull(it) }

        return candidateIndices
            .filter { it in propertyNames.indices }
            .filter { isLoggable(propertyNames[it], state?.getOrNull(it) ?: oldState?.getOrNull(it)) }
            .mapNotNull { index ->
                val name = propertyNames[index]
                // Compared unredacted, then redacted for output. Hibernate flags a property dirty
                // on identity rather than equality, so an equal-but-not-same value has to be
                // filtered out here - and comparing the redacted forms instead would make every
                // password change look like no change at all, since both sides read "***".
                val oldValue = renderValue(oldState?.getOrNull(index))
                val newValue = renderValue(state?.getOrNull(index))
                if (oldValue == newValue) {
                    null
                } else {
                    name to listOf(redactIfNeeded(name, oldValue, redactedFields), redactIfNeeded(name, newValue, redactedFields))
                }
            }
            .toMap()
    }

    /**
     * Collections are skipped rather than rendered: a `@OneToMany` shows up here as the whole child
     * list, and every one of those children is an audited entity in its own right (or deliberately
     * isn't) - logging the parent's copy of it would duplicate the child entries and, for a lazy
     * collection, force it to load mid-flush.
     */
    private fun isLoggable(propertyName: String, value: Any?): Boolean = propertyName !in AuditScope.ignoredFields && value !is Collection<*> && value !is Map<*, *>

    internal fun renderValue(propertyName: String, value: Any?, redactedFields: Set<String>): Any? = redactIfNeeded(propertyName, renderValue(value), redactedFields)

    private fun redactIfNeeded(propertyName: String, renderedValue: Any?, redactedFields: Set<String>): Any? = if (renderedValue != null && propertyName in redactedFields) REDACTED else renderedValue

    /**
     * Associations are rendered as the referenced row's id rather than the object: an entity's
     * `toString()` is not stable, and reading through to its fields would drag half the object graph
     * into the log. A lazy proxy's id is taken without initializing it.
     */
    private fun renderValue(value: Any?): Any? = when (value) {
        null -> null
        is HibernateProxy -> value.hibernateLazyInitializer.identifier
        is BaseEntity -> value.id
        is Enum<*> -> value.name
        is Boolean, is Number -> value
        is String -> value
        is Temporal -> value.toString()
        is ByteArray -> "<${value.size} bytes>"
        else -> value.toString()
    }
}

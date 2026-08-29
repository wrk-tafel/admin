package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity

/**
 * What the audit trail covers, and how a recorded row is labelled.
 *
 * Deliberately an allow-list rather than "everything with a `created_at`". Two kinds of table are
 * left out on purpose and should stay out:
 *
 * - `distributions_households` and the distribution statistics tables are event records already -
 *   a row *is* the fact that something happened, it is never corrected afterwards - and they carry
 *   by far the highest write volume in the system (one row per household per distribution day).
 * - `login_attempts` and `sse_outbox` are purpose-built infrastructure with their own retention;
 *   auditing them would only duplicate them.
 *
 * Adding an entity here is all it takes to audit it - [AuditLogWriter] reads this map and nothing
 * else. Adding one that is written thousands of times per distribution day is the mistake to watch
 * for.
 */
object AuditScope {

    /**
     * The entity type stamped on a login event, written by
     * [at.wrk.tafel.admin.backend.common.auth.components.LoginAuditService]. A login is never
     * loaded or saved through the persistence context, so - unlike everything else here - it has no
     * [auditedEntities] map entry and [of] never resolves it; it is added to [allEntityTypes]
     * directly so "Login" still shows up as a filter option.
     */
    const val USER_LOGIN_ENTITY_TYPE = "UserLogin"

    /**
     * A scanner-folder file's content viewed before it is imported as a document - see
     * [at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentScannerController]. Not
     * yet attached to a household at that point (import is what does that), so - unlike the "Document"
     * type an imported/uploaded file is audited under afterwards - this has no household-scoped
     * business key and, like [USER_LOGIN_ENTITY_TYPE], no [auditedEntities] map entry.
     */
    const val SCANNER_FILE_ENTITY_TYPE = "ScannerFile"

    /**
     * The Kundenliste PDF generated for the households assigned to a distribution - see
     * [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService.generateHouseholdListPdf].
     * Spans every household in the distribution rather than one, so - like [SCANNER_FILE_ENTITY_TYPE] -
     * it is neither household-scoped nor backed by an [auditedEntities] map entry.
     */
    const val DISTRIBUTION_HOUSEHOLD_LIST_ENTITY_TYPE = "DistributionHouseholdList"

    /**
     * An employee's data-takeout read - see
     * [at.wrk.tafel.admin.backend.modules.base.employee.internal.EmployeeExportService]. Shares its
     * string value with the [EmployeeEntity] entry in [auditedEntities] below, so the export's
     * manually-recorded read lands under the same "Employee" entity type as the insert/update/delete
     * entries an employee's own writes produce.
     */
    const val EMPLOYEE_EXPORT_ENTITY_TYPE = "Employee"

    /**
     * The audit trail's own `search`/`filter-options` queries - see
     * [at.wrk.tafel.admin.backend.modules.audit.internal.AuditService]. Neither spans one household
     * nor one user, so - like [SCANNER_FILE_ENTITY_TYPE] and [DISTRIBUTION_HOUSEHOLD_LIST_ENTITY_TYPE] -
     * it has no [auditedEntities] map entry.
     * [at.wrk.tafel.admin.backend.modules.audit.internal.AuditService.getHouseholdHistory] is the
     * exception: it already has a natural household business key, so its own read is recorded under
     * the "Household" entity type instead of this one, and shows up in that household's own history.
     */
    const val AUDIT_LOG_QUERY_ENTITY_TYPE = "AuditLogQuery"

    /**
     * The above-cost-limit report (its paginated list and its CSV export alike) - see
     * [at.wrk.tafel.admin.backend.modules.household.internal.HouseholdService.getHouseholdsAboveLimit]/
     * `generateAboveLimitCsv`. Spans every household above the limit rather than one, so - like
     * [AUDIT_LOG_QUERY_ENTITY_TYPE] - it has no [auditedEntities] map entry (GDPR G24, issue #3507).
     */
    const val HOUSEHOLDS_ABOVE_LIMIT_ENTITY_TYPE = "HouseholdsAboveLimit"

    /**
     * The new-and-renewed-households report (its JSON view and its CSV export alike) - see
     * [at.wrk.tafel.admin.backend.modules.household.internal.HouseholdService.getHouseholdsOverview]/
     * `generateHouseholdsOverviewCsv`. Spans every household new/renewed in the distribution rather
     * than one, so it has no [auditedEntities] map entry (GDPR G24, issue #3507).
     */
    const val HOUSEHOLDS_OVERVIEW_ENTITY_TYPE = "HouseholdsOverview"

    /**
     * The duplicate-candidates list - see
     * [at.wrk.tafel.admin.backend.modules.household.internal.HouseholdDuplicationService.findDuplicates].
     * Each page embeds full household records for both the anchor and its similar households, so it
     * has no [auditedEntities] map entry (GDPR G24, issue #3507).
     */
    const val HOUSEHOLD_DUPLICATES_ENTITY_TYPE = "HouseholdDuplicates"

    /**
     * A household-merge preview - see
     * [at.wrk.tafel.admin.backend.modules.household.internal.HouseholdMergeService.preview]. Spans
     * the target and every source household rather than one, so it has no [auditedEntities] map
     * entry (GDPR G24, issue #3507).
     */
    const val HOUSEHOLD_MERGE_PREVIEW_ENTITY_TYPE = "HouseholdMergePreview"

    /**
     * @param entityType the label stored in `audit_log.entity_type`. Kept as a stable string rather
     * than the class name so renaming a Kotlin class doesn't split one entity's history in two.
     * @param householdScoped whether [businessKey] yields a household number, i.e. whether entries
     * of this type belong on a household's "Verlauf" tab.
     * @param businessKey what identifies the subject of the change once the row itself is gone.
     * @param redactedFields fields whose *names* are logged but whose values never are.
     */
    data class AuditedEntity(
        val entityType: String,
        val householdScoped: Boolean,
        val businessKey: (Any) -> String?,
        val redactedFields: Set<String> = emptySet(),
    )

    /**
     * Never diffed, for any entity: [BaseChangeTrackingEntity][at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity]'s
     * own bookkeeping (which is already on the row, and whose "changed" is implied by the audit
     * entry existing at all) and the trigger-maintained search column, which changes on every write
     * to a household or user and would bury every real field under a duplicate of the whole record.
     */
    val ignoredFields: Set<String> = setOf("createdAt", "updatedAt", "createdBy", "updatedBy", "searchText")

    private val auditedEntities: Map<Class<*>, AuditedEntity> = mapOf(
        HouseholdEntity::class.java to AuditedEntity(
            entityType = "Household",
            householdScoped = true,
            businessKey = { (it as HouseholdEntity).householdId.toString() },
        ),
        PersonEntity::class.java to AuditedEntity(
            entityType = "Person",
            householdScoped = true,
            businessKey = { (it as PersonEntity).household.householdId.toString() },
        ),
        HouseholdNoteEntity::class.java to AuditedEntity(
            entityType = "HouseholdNote",
            householdScoped = true,
            businessKey = { (it as HouseholdNoteEntity).household.householdId.toString() },
        ),
        DocumentEntity::class.java to AuditedEntity(
            entityType = "Document",
            householdScoped = true,
            businessKey = { (it as DocumentEntity).household.householdId.toString() },
        ),
        EmployeeEntity::class.java to AuditedEntity(
            entityType = "Employee",
            householdScoped = false,
            businessKey = { (it as EmployeeEntity).personnelNumber },
        ),
        UserEntity::class.java to AuditedEntity(
            entityType = "User",
            householdScoped = false,
            businessKey = { (it as UserEntity).username },
            // The stored value is an Argon2 hash rather than the password itself, but a hash is
            // still credential material and an audit trail is read by more people, and kept longer,
            // than the users table. That a password changed is the auditable fact; what it changed
            // to is not.
            redactedFields = setOf("password"),
        ),
        UserAuthorityEntity::class.java to AuditedEntity(
            entityType = "UserAuthority",
            householdScoped = false,
            businessKey = { (it as UserAuthorityEntity).user.username },
        ),
        StaticValueEntity::class.java to AuditedEntity(
            entityType = "StaticValue",
            householdScoped = false,
            businessKey = { (it as StaticValueEntity).type.name },
        ),
        MailRecipientEntity::class.java to AuditedEntity(
            entityType = "MailRecipient",
            householdScoped = false,
            businessKey = { (it as MailRecipientEntity).mailType.name },
        ),
    )

    /**
     * The entity types whose entries make up one household's history. Used both by the "Verlauf"
     * query and to keep a username that happens to look like a household number out of it.
     */
    val householdScopedEntityTypes: Set<String> =
        auditedEntities.values.filter { it.householdScoped }.map { it.entityType }.toSet()

    /**
     * The bulk household reports - each entry spans every household the report/export returned,
     * not one - so `ExcessiveReadAccessDetectionService` weighs a read of one of these more heavily
     * than the default 1 (`tafeladmin.audit.breachDetection.bulkReadWeight`, GDPR G24, issue #3507).
     */
    val bulkReportEntityTypes: Set<String> = setOf(
        HOUSEHOLDS_ABOVE_LIMIT_ENTITY_TYPE,
        HOUSEHOLDS_OVERVIEW_ENTITY_TYPE,
        HOUSEHOLD_DUPLICATES_ENTITY_TYPE,
        HOUSEHOLD_MERGE_PREVIEW_ENTITY_TYPE,
    )

    val allEntityTypes: List<String> = (
        auditedEntities.values.map { it.entityType } +
            listOf(
                USER_LOGIN_ENTITY_TYPE,
                SCANNER_FILE_ENTITY_TYPE,
                DISTRIBUTION_HOUSEHOLD_LIST_ENTITY_TYPE,
                EMPLOYEE_EXPORT_ENTITY_TYPE,
                AUDIT_LOG_QUERY_ENTITY_TYPE,
                HOUSEHOLDS_ABOVE_LIMIT_ENTITY_TYPE,
                HOUSEHOLDS_OVERVIEW_ENTITY_TYPE,
                HOUSEHOLD_DUPLICATES_ENTITY_TYPE,
                HOUSEHOLD_MERGE_PREVIEW_ENTITY_TYPE,
            )
        ).distinct().sorted()

    /**
     * Takes the *mapped* class (`EntityPersister.getMappedClass()`), never `entity.javaClass`: a
     * lazily-loaded instance is a generated proxy subclass and would miss this map entirely.
     * Resolved by exact class rather than assignability, so nothing gets audited by inheriting from
     * something that is.
     */
    fun of(entityClass: Class<*>): AuditedEntity? = auditedEntities[entityClass]
}

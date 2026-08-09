package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdNoteRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeField
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergePreviewResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class HouseholdMergeService(
    private val householdRepository: HouseholdRepository,
    private val personRepository: PersonRepository,
    private val householdNoteRepository: HouseholdNoteRepository,
    private val documentRepository: DocumentRepository,
    private val distributionHouseholdRepository: DistributionHouseholdRepository,
    private val householdConverter: HouseholdConverter,
    private val householdService: HouseholdService,
    private val auditLogWriter: AuditLogWriter,
) {

    companion object {
        private val log = LoggerFactory.getLogger(HouseholdMergeService::class.java)
    }

    @Transactional(readOnly = true)
    fun preview(targetHouseholdId: Long, sourceHouseholdIds: List<Long>): HouseholdMergePreviewResponse {
        val (target, sources) = resolve(targetHouseholdId, sourceHouseholdIds)
        val sourceEntityIds = sources.map { it.id!! }
        val householdEntityIds = sourceEntityIds + target.id!!

        val distributionRows = distributionHouseholdRepository.findAllByHouseholdEntityIds(householdEntityIds)
        val plan = HouseholdMergePlanner.buildPlan(target, sources, distributionRows, householdConverter::mapPerson)

        return HouseholdMergePreviewResponse(
            target = householdConverter.mapEntityToHousehold(target),
            sources = sources.map { householdConverter.mapEntityToHousehold(it) },
            fieldConflicts = plan.fieldConflicts,
            persons = plan.personItems,
            distributionCollisions = plan.distributionCollisions,
            noteCount = householdNoteRepository.countByHouseholdEntityIdIn(sourceEntityIds),
            documentCount = documentRepository.countByHouseholdIdIn(sourceEntityIds),
        )
    }

    /**
     * Execution order matters here - see the household module README for the full rationale.
     * Short version: 1) apply the caller's field picks onto [target] while it's still the fresh,
     * attached entity from [resolve] (a plain scalar mutation + flush - never through
     * `HouseholdConverter.mapHouseholdToEntity`); 2) resolve `distributions_households` collisions
     * (fold flags onto the survivor, delete the losers) *before* re-pointing anything, so
     * `uq_distributions_households` can never be violated; 3) re-parent surviving distribution rows,
     * notes, documents (remapping `person_id` for documents of dropped-duplicate persons first) and
     * kept persons onto the target via bulk `@Modifying(clearAutomatically = true)` updates - never
     * by mutating `source.persons`/`.documents` in memory, which would schedule an orphan-removal
     * DELETE for rows we're simultaneously trying to keep; 4) only once every child row has been
     * moved is each source shell deleted via the existing, unchanged
     * `HouseholdService.deleteHouseholdByHouseholdId`.
     */
    @Transactional
    fun merge(targetHouseholdId: Long, request: HouseholdMergeRequest): HouseholdMergeResponse {
        val (target, sources) = resolve(targetHouseholdId, request.sourceHouseholdIds)
        val sourcesByHouseholdId = sources.associateBy { it.householdId }
        val sourceEntityIds = sources.map { it.id!! }
        val householdEntityIds = sourceEntityIds + target.id!!

        val distributionRows = distributionHouseholdRepository.findAllByHouseholdEntityIds(householdEntityIds)
        val plan = HouseholdMergePlanner.buildPlan(target, sources, distributionRows, householdConverter::mapPerson)

        validateFieldSelections(request, sourcesByHouseholdId)

        // Captured while target/sources are still attached: the re-parenting below runs as
        // `clearAutomatically = true` bulk updates, after which reading `source.persons` would go
        // back to a detached entity. Needed by the audit entries at the end of this method.
        val targetEntityId = target.id!!
        val sourceHouseholdIdByPersonId = sources
            .flatMap { source -> source.persons.mapNotNull { person -> person.id?.let { it to source.householdId } } }
            .toMap()

        // 1) field selections, while target/sources are still the fresh entities from resolve()
        HouseholdMergeField.entries.forEach { field ->
            val winnerHouseholdId = request.fieldSelections.firstOrNull { it.field == field }?.sourceHouseholdId
            if (winnerHouseholdId != null) {
                HouseholdMergePlanner.applyField(field, target, sourcesByHouseholdId.getValue(winnerHouseholdId))
            }
        }
        householdRepository.saveAndFlush(target)

        // 2) fold distribution-collision flags onto survivors, then delete the collided losers -
        // before any re-pointing, so the unique constraint can never be tripped
        if (plan.distributionFlagUpdates.isNotEmpty()) {
            val rowsById = distributionRows.associateBy { it.id!! }
            val winners = plan.distributionFlagUpdates.map { (rowId, flags) ->
                val row = rowsById.getValue(rowId)
                row.processed = flags.first
                row.costContributionPaid = flags.second
                row
            }
            distributionHouseholdRepository.saveAllAndFlush(winners)
        }
        if (plan.distributionRowIdsToDrop.isNotEmpty()) {
            distributionHouseholdRepository.deleteAllByIdInBatch(plan.distributionRowIdsToDrop)
        }

        val targetRef = householdRepository.getReferenceByHouseholdId(targetHouseholdId)

        // 3) re-parent surviving child data
        if (plan.distributionRowIdsToMove.isNotEmpty()) {
            distributionHouseholdRepository.reassignToHousehold(targetRef, plan.distributionRowIdsToMove)
        }

        val noteCount = householdNoteRepository.countByHouseholdEntityIdIn(sourceEntityIds)
        householdNoteRepository.reassignToHousehold(targetRef, sourceEntityIds)

        val documentCount = documentRepository.countByHouseholdIdIn(sourceEntityIds)
        plan.duplicatePersonIdToMatchedTargetPersonId.forEach { (sourcePersonId, targetPersonId) ->
            documentRepository.reassignPerson(personRepository.getReferenceById(targetPersonId), sourcePersonId)
        }
        documentRepository.reassignToHousehold(targetRef, sourceEntityIds)

        if (plan.personIdsToMove.isNotEmpty()) {
            personRepository.reassignToHousehold(targetRef, plan.personIdsToMove)
        }

        // 4) only now, with no children left to lose, delete each source shell
        sources.forEach { source -> householdService.deleteHouseholdByHouseholdId(source.householdId) }

        // 5) the re-parenting in step 3 went through bulk queries, which Hibernate's flush-time
        // events never see - so the audit trail is told about it explicitly. The source shells' own
        // DELETE entries come from the listener via step 4 and need nothing here.
        recordMergeAuditEntries(
            targetHouseholdId = targetHouseholdId,
            targetEntityId = targetEntityId,
            sourceHouseholdIds = sources.map { it.householdId },
            sourceHouseholdIdByPersonId = sourceHouseholdIdByPersonId,
            plan = plan,
            noteCount = noteCount,
            documentCount = documentCount,
        )

        val mergedTarget = householdRepository.findByHouseholdId(targetHouseholdId)!!
        log.info(
            "Merged households {} into {} (moved {} person(s), dropped {} duplicate person(s))",
            sources.map { it.householdId },
            targetHouseholdId,
            plan.personIdsToMove.size,
            plan.duplicatePersonIdToMatchedTargetPersonId.size,
        )
        return HouseholdMergeResponse(
            target = householdConverter.mapEntityToHousehold(mergedTarget),
            movedPersonCount = plan.personIdsToMove.size,
            droppedDuplicatePersonCount = plan.duplicatePersonIdToMatchedTargetPersonId.size,
            movedNoteCount = noteCount,
            movedDocumentCount = documentCount,
            movedDistributionCount = plan.distributionRowIdsToMove.size,
            droppedDistributionCount = plan.distributionRowIdsToDrop.size,
            deletedHouseholdIds = sources.map { it.householdId },
        )
    }

    /**
     * A merge is the one household operation that leaves no trace of its own: every row it touches
     * either moves through a bulk `@Modifying` query - invisible to the Hibernate listener that
     * feeds `audit_log` - or belongs to a household that is deleted a moment later.
     *
     * Three kinds of entry come out of it, all under the *target*'s business key so they land on the
     * household that still exists:
     *
     * - one per moved person, so an individual person's move stays traceable;
     * - one summarising the merge on the target;
     * - one per source, recording where its data went. The source's own DELETE entry (with its last
     *   field values) is written separately by the listener, under the source's own key.
     *
     * Notes and documents are recorded as counts rather than one entry each: unlike persons they
     * are neither re-keyed nor deduplicated, they simply follow the household they hang off, and
     * their own content is untouched.
     */
    private fun recordMergeAuditEntries(
        targetHouseholdId: Long,
        targetEntityId: Long,
        sourceHouseholdIds: List<Long>,
        sourceHouseholdIdByPersonId: Map<Long, Long>,
        plan: HouseholdMergePlanner.HouseholdMergePlan,
        noteCount: Int,
        documentCount: Int,
    ) {
        val targetKey = targetHouseholdId.toString()

        plan.personIdsToMove.forEach { personId ->
            auditLogWriter.record(
                AuditLogWriter.PendingEntry(
                    entityType = "Person",
                    entityId = personId,
                    businessKey = targetKey,
                    operation = AuditOperation.UPDATE,
                    changedFields = mapOf(
                        "household" to listOf(sourceHouseholdIdByPersonId[personId], targetHouseholdId),
                    ),
                ),
            )
        }

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "Household",
                entityId = targetEntityId,
                businessKey = targetKey,
                operation = AuditOperation.UPDATE,
                changedFields = mapOf(
                    "mergedFromHouseholds" to listOf(null, sourceHouseholdIds.joinToString(", ")),
                    "movedPersons" to listOf(null, plan.personIdsToMove.size),
                    "droppedDuplicatePersons" to listOf(null, plan.duplicatePersonIdToMatchedTargetPersonId.size),
                    "movedNotes" to listOf(null, noteCount),
                    "movedDocuments" to listOf(null, documentCount),
                    "movedDistributions" to listOf(null, plan.distributionRowIdsToMove.size),
                    "droppedDistributions" to listOf(null, plan.distributionRowIdsToDrop.size),
                ),
            ),
        )

        sourceHouseholdIds.forEach { sourceHouseholdId ->
            auditLogWriter.record(
                AuditLogWriter.PendingEntry(
                    entityType = "Household",
                    entityId = null,
                    businessKey = sourceHouseholdId.toString(),
                    operation = AuditOperation.UPDATE,
                    changedFields = mapOf(
                        "mergedIntoHousehold" to listOf(sourceHouseholdId, targetHouseholdId),
                    ),
                ),
            )
        }
    }

    private fun validateFieldSelections(request: HouseholdMergeRequest, sourcesByHouseholdId: Map<Long, HouseholdEntity>) {
        request.fieldSelections.forEach { selection ->
            val sourceHouseholdId = selection.sourceHouseholdId
            if (sourceHouseholdId != null && !sourcesByHouseholdId.containsKey(sourceHouseholdId)) {
                throw ConflictException("Ungültige Auswahl für Feld ${selection.field}: Kunde Nr. $sourceHouseholdId gehört nicht zu diesem Zusammenführungsvorgang")
            }
        }
    }

    /**
     * @param sourceHouseholdIds business `householdId`s (never entity primary keys).
     */
    private fun resolve(targetHouseholdId: Long, sourceHouseholdIds: List<Long>): Pair<HouseholdEntity, List<HouseholdEntity>> {
        if (sourceHouseholdIds.isEmpty()) {
            throw ConflictException("Es muss mindestens ein zusammenzuführender Kunde angegeben werden")
        }
        if (sourceHouseholdIds.distinct().size != sourceHouseholdIds.size) {
            throw ConflictException("Ein Kunde wurde mehrfach als Quelle angegeben")
        }
        if (sourceHouseholdIds.contains(targetHouseholdId)) {
            throw ConflictException("Der Ziel-Kunde Nr. $targetHouseholdId kann nicht gleichzeitig Quelle sein")
        }

        val target = householdRepository.findByHouseholdId(targetHouseholdId)
            ?: throw NotFoundException("Kunde Nr. $targetHouseholdId nicht vorhanden!")

        val sources = sourceHouseholdIds.map { sourceHouseholdId ->
            householdRepository.findByHouseholdId(sourceHouseholdId)
                ?: throw NotFoundException("Kunde Nr. $sourceHouseholdId nicht vorhanden!")
        }

        return target to sources
    }
}

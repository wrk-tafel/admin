package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeDistributionCollisionItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeField
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergeFieldConflictItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdMergePersonItem
import at.wrk.tafel.admin.backend.modules.household.Person
import java.math.BigDecimal
import java.time.LocalDate

/**
 * Pure planning logic for [HouseholdMergeService] - reads [HouseholdEntity]/[DistributionHouseholdEntity]
 * instances passed in and returns a description of what would happen, without touching a repository
 * or the persistence context. Kept separate from the service so `preview()` and `merge()` can share
 * the exact same conflict/dedup/collision logic (they can never drift), and so the logic is cheap to
 * unit test without mocking JPA.
 */
internal object HouseholdMergePlanner {

    data class HouseholdMergePlan(
        val fieldConflicts: List<HouseholdMergeFieldConflictItem>,
        val personItems: List<HouseholdMergePersonItem>,
        val personIdsToMove: List<Long>,
        val duplicatePersonIdToMatchedTargetPersonId: Map<Long, Long>,
        val distributionRowIdsToMove: List<Long>,
        val distributionRowIdsToDrop: List<Long>,
        val distributionFlagUpdates: Map<Long, Pair<Boolean, Boolean>>,
        val distributionCollisions: List<HouseholdMergeDistributionCollisionItem>,
    )

    fun buildPlan(
        target: HouseholdEntity,
        sources: List<HouseholdEntity>,
        distributionRows: List<DistributionHouseholdEntity>,
        personMapper: (PersonEntity) -> Person,
    ): HouseholdMergePlan {
        val personPlan = buildPersonPlan(target, sources, personMapper)
        val distributionPlan = buildDistributionPlan(target, sources, distributionRows)

        return HouseholdMergePlan(
            fieldConflicts = buildFieldConflicts(target, sources),
            personItems = personPlan.items,
            personIdsToMove = personPlan.personIdsToMove,
            duplicatePersonIdToMatchedTargetPersonId = personPlan.duplicateMap,
            distributionRowIdsToMove = distributionPlan.rowIdsToMove,
            distributionRowIdsToDrop = distributionPlan.rowIdsToDrop,
            distributionFlagUpdates = distributionPlan.flagUpdates,
            distributionCollisions = distributionPlan.collisions,
        )
    }

    // ---------------------------------------------------------------------------
    // Field conflicts

    private fun buildFieldConflicts(target: HouseholdEntity, sources: List<HouseholdEntity>): List<HouseholdMergeFieldConflictItem> = HouseholdMergeField.entries.mapNotNull { field ->
        val conflictingSourceHouseholdIds = sources.filterNot { fieldValuesEqual(field, target, it) }.map { it.householdId!! }
        if (conflictingSourceHouseholdIds.isEmpty()) null else HouseholdMergeFieldConflictItem(field, conflictingSourceHouseholdIds)
    }

    /**
     * Applies [winner]'s value for [field] onto [target] - a plain scalar assignment, deliberately
     * never routed through `HouseholdConverter.mapHouseholdToEntity` (its `persons.clear()` +
     * `orphanRemoval` semantics would delete persons not present in a naive request).
     */
    fun applyField(field: HouseholdMergeField, target: HouseholdEntity, winner: HouseholdEntity) {
        when (field) {
            HouseholdMergeField.ADDRESS -> {
                target.addressStreet = winner.addressStreet
                target.addressHouseNumber = winner.addressHouseNumber
                target.addressStairway = winner.addressStairway
                target.addressDoor = winner.addressDoor
                target.addressPostalCode = winner.addressPostalCode
                target.addressCity = winner.addressCity
            }

            HouseholdMergeField.TELEPHONE_NUMBER -> target.telephoneNumber = winner.telephoneNumber
            HouseholdMergeField.EMAIL -> target.email = winner.email
            HouseholdMergeField.VALID_UNTIL -> target.validUntil = winner.validUntil

            HouseholdMergeField.LOCK_STATE -> {
                target.locked = winner.locked
                target.lockedAt = winner.lockedAt
                target.lockedBy = winner.lockedBy
                target.lockReason = winner.lockReason
            }

            HouseholdMergeField.PENDING_COST_CONTRIBUTION -> target.pendingCostContribution = winner.pendingCostContribution
            HouseholdMergeField.SINGLE_PARENT -> target.singleParent = winner.singleParent

            HouseholdMergeField.MAIN_PERSON_FIRSTNAME -> target.mainPerson!!.firstname = winner.mainPerson?.firstname
            HouseholdMergeField.MAIN_PERSON_LASTNAME -> target.mainPerson!!.lastname = winner.mainPerson?.lastname
            HouseholdMergeField.MAIN_PERSON_BIRTHDATE -> target.mainPerson!!.birthDate = winner.mainPerson?.birthDate
            HouseholdMergeField.MAIN_PERSON_GENDER -> target.mainPerson!!.gender = winner.mainPerson?.gender
            HouseholdMergeField.MAIN_PERSON_COUNTRY -> target.mainPerson!!.country = winner.mainPerson?.country
            HouseholdMergeField.MAIN_PERSON_EMPLOYER -> target.mainPerson!!.employer = winner.mainPerson?.employer
            HouseholdMergeField.MAIN_PERSON_INCOME -> target.mainPerson!!.income = winner.mainPerson?.income
            HouseholdMergeField.MAIN_PERSON_INCOME_DUE -> target.mainPerson!!.incomeDue = winner.mainPerson?.incomeDue
        }
    }

    private fun fieldValuesEqual(field: HouseholdMergeField, a: HouseholdEntity, b: HouseholdEntity): Boolean = when (field) {
        HouseholdMergeField.ADDRESS -> addressTuple(a) == addressTuple(b)
        HouseholdMergeField.TELEPHONE_NUMBER -> normalizedString(a.telephoneNumber) == normalizedString(b.telephoneNumber)
        HouseholdMergeField.EMAIL -> normalizedString(a.email) == normalizedString(b.email)
        HouseholdMergeField.VALID_UNTIL -> a.validUntil == b.validUntil
        HouseholdMergeField.LOCK_STATE -> lockTuple(a) == lockTuple(b)
        HouseholdMergeField.PENDING_COST_CONTRIBUTION -> a.pendingCostContribution.compareTo(b.pendingCostContribution) == 0
        HouseholdMergeField.SINGLE_PARENT -> (a.singleParent ?: false) == (b.singleParent ?: false)
        HouseholdMergeField.MAIN_PERSON_FIRSTNAME -> normalizedString(a.mainPerson?.firstname) == normalizedString(b.mainPerson?.firstname)
        HouseholdMergeField.MAIN_PERSON_LASTNAME -> normalizedString(a.mainPerson?.lastname) == normalizedString(b.mainPerson?.lastname)
        HouseholdMergeField.MAIN_PERSON_BIRTHDATE -> a.mainPerson?.birthDate == b.mainPerson?.birthDate
        HouseholdMergeField.MAIN_PERSON_GENDER -> a.mainPerson?.gender == b.mainPerson?.gender
        HouseholdMergeField.MAIN_PERSON_COUNTRY -> a.mainPerson?.country?.id == b.mainPerson?.country?.id
        HouseholdMergeField.MAIN_PERSON_EMPLOYER -> normalizedString(a.mainPerson?.employer) == normalizedString(b.mainPerson?.employer)
        HouseholdMergeField.MAIN_PERSON_INCOME -> moneyEquals(a.mainPerson?.income, b.mainPerson?.income)
        HouseholdMergeField.MAIN_PERSON_INCOME_DUE -> a.mainPerson?.incomeDue == b.mainPerson?.incomeDue
    }

    private fun moneyEquals(a: BigDecimal?, b: BigDecimal?): Boolean = (a ?: BigDecimal.ZERO).compareTo(b ?: BigDecimal.ZERO) == 0

    private fun normalizedString(value: String?): String? = value?.trim()?.takeIf { it.isNotEmpty() }

    private fun addressTuple(h: HouseholdEntity): List<Any?> = listOf(
        normalizedString(h.addressStreet),
        normalizedString(h.addressHouseNumber),
        normalizedString(h.addressStairway),
        normalizedString(h.addressDoor),
        h.addressPostalCode,
        normalizedString(h.addressCity),
    )

    private fun lockTuple(h: HouseholdEntity): List<Any?> = listOf(
        h.locked ?: false,
        h.lockedAt,
        h.lockedBy?.id,
        normalizedString(h.lockReason),
    )

    // ---------------------------------------------------------------------------
    // Person re-parenting + de-duplication

    private data class PersonMergeKey(val lastname: String, val firstname: String, val birthDate: LocalDate)

    private data class PersonPlanResult(
        val items: List<HouseholdMergePersonItem>,
        val personIdsToMove: List<Long>,
        val duplicateMap: Map<Long, Long>,
    )

    /**
     * A person only matches if lastname, firstname AND birthDate are all present and equal
     * (normalized) - conservative on purpose, since incomplete master data is common in this dataset
     * (see `HouseholdEntity.Specs.postProcessingNecessary()`) and silently discarding a family member
     * because of a blank field would be worse than an occasional missed duplicate.
     */
    private fun personKey(person: PersonEntity): PersonMergeKey? {
        val lastname = person.lastname?.trim()?.lowercase()?.replace(Regex("\\s+"), " ")?.takeIf { it.isNotEmpty() }
        val firstname = person.firstname?.trim()?.lowercase()?.replace(Regex("\\s+"), " ")?.takeIf { it.isNotEmpty() }
        val birthDate = person.birthDate

        return if (lastname == null || firstname == null || birthDate == null) {
            null
        } else {
            PersonMergeKey(lastname, firstname, birthDate)
        }
    }

    private fun buildPersonPlan(
        target: HouseholdEntity,
        sources: List<HouseholdEntity>,
        personMapper: (PersonEntity) -> Person,
    ): PersonPlanResult {
        // Seeded with the target's own persons, then extended as each source (in request order)
        // contributes accepted persons - otherwise two sources both carrying an identical
        // not-on-target person would both get moved instead of being deduplicated against each other.
        val claimedBy = mutableMapOf<PersonMergeKey, Long>()
        target.persons.forEach { person -> personKey(person)?.let { key -> claimedBy.putIfAbsent(key, person.id!!) } }

        val items = mutableListOf<HouseholdMergePersonItem>()
        val personIdsToMove = mutableListOf<Long>()
        val duplicateMap = mutableMapOf<Long, Long>()

        sources.forEach { source ->
            source.persons.forEach { person ->
                val key = personKey(person)
                val matchedTargetPersonId = key?.let { claimedBy[it] }

                if (matchedTargetPersonId != null) {
                    items += HouseholdMergePersonItem(
                        sourceHouseholdId = source.householdId!!,
                        person = personMapper(person),
                        duplicate = true,
                        matchedPersonId = matchedTargetPersonId,
                    )
                    duplicateMap[person.id!!] = matchedTargetPersonId
                } else {
                    items += HouseholdMergePersonItem(
                        sourceHouseholdId = source.householdId!!,
                        person = personMapper(person),
                        duplicate = false,
                    )
                    personIdsToMove += person.id!!
                    if (key != null) claimedBy[key] = person.id!!
                }
            }
        }

        return PersonPlanResult(items, personIdsToMove, duplicateMap)
    }

    // ---------------------------------------------------------------------------
    // Distribution/ticket history + the `uq_distributions_households` collision

    private data class DistributionPlanResult(
        val rowIdsToMove: List<Long>,
        val rowIdsToDrop: List<Long>,
        val flagUpdates: Map<Long, Pair<Boolean, Boolean>>,
        val collisions: List<HouseholdMergeDistributionCollisionItem>,
    )

    /**
     * Groups every distribution-attendance row of the target and its sources by `distribution_id`.
     * A group of size 1 just needs to move (if it belongs to a source) - two rows for *different*
     * distributions never collide. A group of size &gt;1 means target and source(s) attended the
     * *same* distribution, which would violate `uq_distributions_households` if re-pointed naively:
     * the target's own row wins if it has one, otherwise the lowest-id (earliest-registered) source
     * row does; its `ticketNumber` is never overwritten; `processed`/`costContributionPaid` are
     * folded onto it from every row it beats (OR / AND, in the organization's favor) before the
     * losers are deleted.
     */
    private fun buildDistributionPlan(
        target: HouseholdEntity,
        sources: List<HouseholdEntity>,
        rows: List<DistributionHouseholdEntity>,
    ): DistributionPlanResult {
        val targetEntityId = target.id!!
        val entityIdToHousehold = (sources + target).associateBy { it.id!! }

        val rowIdsToMove = mutableListOf<Long>()
        val rowIdsToDrop = mutableListOf<Long>()
        val flagUpdates = mutableMapOf<Long, Pair<Boolean, Boolean>>()
        val collisions = mutableListOf<HouseholdMergeDistributionCollisionItem>()

        rows.groupBy { it.distribution!!.id!! }.forEach { (_, groupRows) ->
            if (groupRows.size == 1) {
                val row = groupRows.first()
                if (row.household!!.id != targetEntityId) {
                    rowIdsToMove += row.id!!
                }
                return@forEach
            }

            val winner = groupRows.firstOrNull { it.household!!.id == targetEntityId } ?: groupRows.minBy { it.id!! }
            val losers = groupRows.filterNot { it.id == winner.id }

            val processed = (winner.processed ?: false) || losers.any { it.processed ?: false }
            val costContributionPaid = (winner.costContributionPaid ?: true) && losers.all { it.costContributionPaid ?: true }
            flagUpdates[winner.id!!] = processed to costContributionPaid

            if (winner.household!!.id != targetEntityId) {
                rowIdsToMove += winner.id!!
            }
            rowIdsToDrop += losers.map { it.id!! }

            losers.forEach { loser ->
                val loserHousehold = entityIdToHousehold.getValue(loser.household!!.id!!)
                collisions += HouseholdMergeDistributionCollisionItem(
                    distributionId = loser.distribution!!.id!!,
                    distributionStartedAt = loser.distribution!!.startedAt,
                    sourceHouseholdId = loserHousehold.householdId!!,
                    targetTicketNumber = winner.ticketNumber,
                    sourceTicketNumber = loser.ticketNumber,
                )
            }
        }

        return DistributionPlanResult(rowIdsToMove, rowIdsToDrop, flagUpdates, collisions)
    }
}

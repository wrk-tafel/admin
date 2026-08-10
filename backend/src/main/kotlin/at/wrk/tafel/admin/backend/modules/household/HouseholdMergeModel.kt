package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import java.time.LocalDateTime

/**
 * Fields a household-merge caller may resolve a target/source conflict for. `ADDRESS` and
 * `LOCK_STATE` are atomic groups (all their sub-fields come from the same side) rather than
 * per-column, since picking e.g. street from one side and city from the other would produce a
 * nonsensical result. `issuer`/`issuedAt`/`prolongedAt` are deliberately not pickable -
 * they're provenance/internal bookkeeping, not user-editable data.
 */
@ExcludeFromTestCoverage
enum class HouseholdMergeField {
    ADDRESS,
    TELEPHONE_NUMBER,
    EMAIL,
    VALID_UNTIL,
    LOCK_STATE,
    PENDING_COST_CONTRIBUTION,
    SINGLE_PARENT,
    MAIN_PERSON_FIRSTNAME,
    MAIN_PERSON_LASTNAME,
    MAIN_PERSON_BIRTHDATE,
    MAIN_PERSON_GENDER,
    MAIN_PERSON_COUNTRY,
    MAIN_PERSON_EMPLOYER,
    MAIN_PERSON_INCOME,
    MAIN_PERSON_INCOME_DUE,
}

/**
 * Picks which household's value wins for [field]. `sourceHouseholdId == null` means "keep the
 * target's value" (the default if a conflicting field is omitted entirely).
 */
@ExcludeFromTestCoverage
data class HouseholdMergeFieldSelectionItem(
    @field:NotNull
    val field: HouseholdMergeField?,
    val sourceHouseholdId: Long? = null,
)

@ExcludeFromTestCoverage
data class HouseholdMergeRequest(
    @field:NotEmpty
    val sourceHouseholdIds: List<Long>,
    val fieldSelections: List<@Valid HouseholdMergeFieldSelectionItem> = emptyList(),
)

@ExcludeFromTestCoverage
data class HouseholdMergeFieldConflictItem(
    val field: HouseholdMergeField,
    val conflictingSourceHouseholdIds: List<Long>,
)

@ExcludeFromTestCoverage
data class HouseholdMergePersonItem(
    val sourceHouseholdId: Long,
    val person: Person,
    val duplicate: Boolean,
    val matchedPersonId: Long? = null,
)

@ExcludeFromTestCoverage
data class HouseholdMergeDistributionCollisionItem(
    val distributionId: Long,
    val distributionStartedAt: LocalDateTime?,
    val sourceHouseholdId: Long,
    val targetTicketNumber: Int?,
    val sourceTicketNumber: Int?,
)

@ExcludeFromTestCoverage
data class HouseholdMergePreviewResponse(
    val target: HouseholdResponse,
    val sources: List<HouseholdResponse>,
    val fieldConflicts: List<HouseholdMergeFieldConflictItem>,
    val persons: List<HouseholdMergePersonItem>,
    val distributionCollisions: List<HouseholdMergeDistributionCollisionItem>,
    val noteCount: Int,
    val documentCount: Int,
)

@ExcludeFromTestCoverage
data class HouseholdMergeResponse(
    val target: HouseholdResponse,
    val movedPersonCount: Int,
    val droppedDuplicatePersonCount: Int,
    val movedNoteCount: Int,
    val movedDocumentCount: Int,
    val movedDistributionCount: Int,
    val droppedDistributionCount: Int,
    val deletedHouseholdIds: List<Long>,
)

package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdSearchFilters
import jakarta.validation.Valid
import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * Bound to `POST /households/search`'s body rather than sent as `?searchInput=...` query
 * parameters - a search term is, in practice, a customer's name, and a query string ends up in the
 * never-rotated `access.log`, the browser's history and support-mail context (GDPR gap G25, issue
 * #3506) with no way to keep it out short of never putting it in a URL at all. See ADR-0057.
 */
@ExcludeFromTestCoverage
data class HouseholdSearchRequest(
    val searchInput: String? = null,
    val page: Int? = null,
    val pageSize: Int? = null,
    val sortBy: String? = null,
    val sortDirection: String? = null,
    val filters: HouseholdSearchFilters = HouseholdSearchFilters(),
)

@ExcludeFromTestCoverage
data class HouseholdCreationResponse(
    val data: HouseholdResponse,
    val errorMsg: String?,
)

@ExcludeFromTestCoverage
data class HouseholdUpdateResponse(
    val data: HouseholdResponse,
    val errorMsg: String?,
)

@ExcludeFromTestCoverage
data class HouseholdRequest(
    val id: Long? = null,
    val issuer: HouseholdIssuer? = null,
    val issuedAt: LocalDate? = null,
    @field:Valid
    val address: HouseholdAddress,
    val telephoneNumber: String? = null,
    @field:Email
    val email: String? = null,
    val validUntil: LocalDate? = null,
    val locked: Boolean? = null,
    val lockedAt: LocalDateTime? = null,
    val lockedBy: String? = null,
    val lockReason: String? = null,
    val lockReasonType: HouseholdLockReason? = null,
    val lockedUntil: LocalDate? = null,
    val pendingCostContribution: BigDecimal? = null,
    val singleParent: Boolean? = null,
    val persons: List<@Valid Person> = emptyList(),
) {
    /**
     * The single person of this household flagged as main person.
     */
    fun mainPerson(): Person? = persons.firstOrNull { it.isMainPerson }

    /**
     * Every household member except the main person.
     */
    fun additionalPersons(): List<Person> = persons.filterNot { it.isMainPerson }

    /**
     * Without this, zero flagged persons silently persists `households.main_person_id = null` (later
     * NPEs in `HouseholdPdfService`/`HouseholdMergePlanner`, and the household drops out of both
     * duplicate-detection SQL joins), and two flagged persons only fails at the database's partial
     * unique index as an unhandled 500 - both now a 400 here instead.
     */
    @AssertTrue(message = "Es muss genau eine Hauptperson vorhanden sein!")
    fun isMainPersonCountValid(): Boolean = persons.count { it.isMainPerson } == 1

    /**
     * The reason itself is always free text - [lockReasonType] only tags it with one of a handful of
     * common categories for [at.wrk.tafel.admin.backend.database.model.household.HouseholdRetentionService]
     * (issue #3753) to key off, and is entirely optional, not an exhaustive enumeration a caller must
     * pick from.
     */
    @AssertTrue(message = "Sperrgrund muss angegeben werden!")
    fun isLockReasonValid(): Boolean = locked != true || !lockReason.isNullOrBlank()

    /** A lock that already expired the moment it is set would never actually lock anything. */
    @AssertTrue(message = "Das Ablaufdatum der Sperre darf nicht in der Vergangenheit liegen!")
    fun isLockedUntilValid(): Boolean = locked != true || lockedUntil == null || !lockedUntil.isBefore(LocalDate.now())
}

@ExcludeFromTestCoverage
data class HouseholdResponse(
    val id: Long? = null,
    val issuer: HouseholdIssuer? = null,
    val issuedAt: LocalDate? = null,
    val address: HouseholdAddress,
    val telephoneNumber: String? = null,
    val email: String? = null,
    val validUntil: LocalDate? = null,
    val locked: Boolean? = null,
    val lockedAt: LocalDateTime? = null,
    val lockedBy: String? = null,
    val lockReason: String? = null,
    val lockReasonType: HouseholdLockReason? = null,
    val lockedUntil: LocalDate? = null,
    val pendingCostContribution: BigDecimal? = null,
    val singleParent: Boolean? = null,
    val persons: List<Person> = emptyList(),
    /**
     * Whether a `PRIVACY_NOTICE`-typed document is on file for this household - null wherever the
     * caller didn't ask for it (see `HouseholdConverter.mapEntityToHousehold`), so this is not a
     * blanket "false means missing" signal, only where it is actually populated (currently
     * `HouseholdService.findByHouseholdId`, for the checkin screen's warning).
     */
    val hasPrivacyNotice: Boolean? = null,
) {
    /**
     * The single person of this household flagged as main person.
     */
    fun mainPerson(): Person? = persons.firstOrNull { it.isMainPerson }

    /**
     * Every household member except the main person.
     */
    fun additionalPersons(): List<Person> = persons.filterNot { it.isMainPerson }
}

@ExcludeFromTestCoverage
data class HouseholdIssuer(
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
)

@ExcludeFromTestCoverage
data class HouseholdAddress(
    @field:NotBlank
    val street: String?,
    @field:NotBlank
    val houseNumber: String?,
    val stairway: String? = null,
    val door: String? = null,
    @field:NotNull
    @field:Positive
    val postalCode: Int?,
    @field:NotBlank
    val city: String?,
)

@ExcludeFromTestCoverage
data class Person(
    val id: Long? = null,
    val isMainPerson: Boolean = false,
    @field:NotBlank
    val firstname: String?,
    @field:NotBlank
    val lastname: String?,
    @field:NotNull
    val birthDate: LocalDate?,
    @field:NotNull
    val gender: PersonGender?,
    val country: CountryItem,
    val employer: String? = null,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null,
    val receivesFamilyAllowance: Boolean = false,
    val excludeFromHousehold: Boolean = false,
)

/**
 * Input for the income quick-check: the bare minimum the income validation needs per person, so an
 * operator can find out whether a household would qualify before the rest of its data (names,
 * address, ...) is ever typed in. Validated against the same rules as `POST /validate` and answered
 * with the same [ValidateHouseholdResponse].
 */
@ExcludeFromTestCoverage
data class IncomeQuickCheckRequest(
    @field:NotEmpty
    val persons: List<@Valid IncomeQuickCheckPersonItem> = emptyList(),
)

@ExcludeFromTestCoverage
data class IncomeQuickCheckPersonItem(
    @field:NotNull
    val birthDate: LocalDate?,
    @field:PositiveOrZero
    val income: BigDecimal? = null,
    val receivesFamilyAllowance: Boolean = false,
)

@ExcludeFromTestCoverage
data class ValidateHouseholdResponse(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal,
    val details: IncomeCalculationDetails,
)

/**
 * What [ValidateHouseholdResponse.totalSum] and `limit` are made up of, so the frontend can show
 * the calculation rather than only its outcome. Every amount here is part of one of those two
 * totals - `totalSum` is [incomeSum] + [familyAllowanceSum] + [childTaxAllowanceSum] +
 * [siblingAdditionSum], `limit` is [baseLimit] + [additionalAdultsSum] + [additionalChildrenSum] +
 * [ValidateHouseholdResponse.toleranceValue].
 */
@ExcludeFromTestCoverage
data class IncomeCalculationDetails(
    val incomeSum: BigDecimal,
    val familyAllowanceSum: BigDecimal,
    val childTaxAllowanceSum: BigDecimal,
    val siblingAdditionSum: BigDecimal,
    val baseLimit: BigDecimal,
    val baseLimitCountAdults: Int,
    val baseLimitCountChildren: Int,
    val additionalAdultsCount: Int,
    val additionalAdultsSum: BigDecimal,
    val additionalChildrenCount: Int,
    val additionalChildrenSum: BigDecimal,
)

@ExcludeFromTestCoverage
enum class HouseholdPdfType {
    MASTERDATA,
    IDCARD,
    PRIVACY_NOTICE,
}

/**
 * The forms the ID card is handed out in for a phone rather than for the printer - see
 * `HouseholdIdCardService`. [WALLET] exists only where the deployment can sign a pass
 * (`ConfigResponse.walletPassEnabled`).
 */
@ExcludeFromTestCoverage
enum class HouseholdIdCardFormat {
    PDF,
    IMAGE,
    WALLET,
}

/**
 * Input for `POST /{householdId}/id-card/send-mail`: which forms of the card to attach. There is no
 * recipient in it on purpose - the mail goes to the address stored on the household.
 */
@ExcludeFromTestCoverage
data class HouseholdIdCardMailRequest(
    @field:NotEmpty(message = "Es muss mindestens ein Format ausgewählt werden!")
    val formats: Set<HouseholdIdCardFormat>? = null,
)

@ExcludeFromTestCoverage
enum class PersonGender {
    MALE,
    FEMALE,
}

/**
 * API-facing counterpart of [at.wrk.tafel.admin.backend.database.model.household.HouseholdLockReason] -
 * controllers must not depend on `database.model` types directly (see `ProjectSpecificRulesTest`),
 * so this mirrors it structurally; `HouseholdConverter` converts between the two, same as
 * `PersonGender`/`Gender` for households/persons.
 */
@ExcludeFromTestCoverage
enum class HouseholdLockReason {
    BANNED_FROM_PREMISES,
    CODE_OF_CONDUCT_VIOLATION,
    MISUSE_OF_SERVICES,
    OTHER,
}

@ExcludeFromTestCoverage
data class HouseholdDuplicationItem(
    val household: HouseholdResponse,
    val similarHouseholds: List<HouseholdResponse>,
)

@ExcludeFromTestCoverage
data class HouseholdDuplicateDismissRequest(
    @field:NotNull
    val householdId: Long? = null,
    @field:NotNull
    val otherHouseholdId: Long? = null,
)

/**
 * Input for `POST /{householdId}/lock`: the lock alone, never the household it is put on - see
 * `HouseholdLockService`. [lockReasonType] only tags the always-required free-text [lockReason] and
 * stays optional.
 */
@ExcludeFromTestCoverage
data class HouseholdLockRequest(
    @field:NotBlank(message = "Sperrgrund muss angegeben werden!")
    val lockReason: String? = null,
    val lockReasonType: HouseholdLockReason? = null,
    val lockedUntil: LocalDate? = null,
) {
    /** A lock that already expired the moment it is set would never actually lock anything. */
    @AssertTrue(message = "Das Ablaufdatum der Sperre darf nicht in der Vergangenheit liegen!")
    fun isLockedUntilValid(): Boolean = lockedUntil == null || !lockedUntil.isBefore(LocalDate.now())
}

/**
 * Input for `POST /{householdId}/prolong`: by how many months the stored `validUntil` moves out. The
 * household itself is never part of it - see `HouseholdService.prolongHousehold`.
 */
@ExcludeFromTestCoverage
data class HouseholdProlongRequest(
    @field:NotNull
    @field:Min(1)
    @field:Max(12)
    val months: Int? = null,
)

@ExcludeFromTestCoverage
data class HouseholdCostContributionPaymentRequest(
    @field:Positive
    val amount: BigDecimal? = null,
)

@ExcludeFromTestCoverage
data class HouseholdCostContributionEditRequest(
    @field:NotNull
    @field:PositiveOrZero
    val amount: BigDecimal? = null,
)

@ExcludeFromTestCoverage
data class HouseholdAboveLimitItem(
    val household: HouseholdResponse,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val amountExceededLimit: BigDecimal,
    val percentageExceededLimit: BigDecimal,
)

/**
 * One row of the "Gesperrte Kunden" list (issue #3763) - deliberately slim, unlike
 * [HouseholdAboveLimitItem]: what a reviewer needs to judge a lock, not the whole household record.
 * [reviewDue] is only ever `true` for a lock without a [lockedUntil] date.
 */
@ExcludeFromTestCoverage
data class LockedHouseholdItem(
    val householdId: Long,
    val name: String?,
    val lockedAt: LocalDateTime?,
    val lockedBy: String?,
    val lockReasonType: HouseholdLockReason?,
    val lockReason: String?,
    val lockedUntil: LocalDate?,
    val lockReviewedAt: LocalDateTime?,
    val lockReviewedBy: String?,
    val reviewDue: Boolean,
)

@ExcludeFromTestCoverage
data class HouseholdOverviewResponse(
    val distributionId: Long?,
    val distributionStartedAt: LocalDateTime?,
    val distributionEndedAt: LocalDateTime?,
    val newHouseholds: List<HouseholdOverviewItem>,
    val renewedHouseholds: List<HouseholdOverviewItem>,
)

@ExcludeFromTestCoverage
data class HouseholdOverviewItem(
    val household: HouseholdResponse,
    val date: LocalDateTime,
)

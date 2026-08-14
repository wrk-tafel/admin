package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

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
    val pendingCostContribution: BigDecimal? = null,
    val singleParent: Boolean? = null,
    val persons: List<Person> = emptyList(),
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
}

@ExcludeFromTestCoverage
enum class PersonGender {
    MALE,
    FEMALE,
}

@ExcludeFromTestCoverage
data class HouseholdDuplicationItem(
    val household: HouseholdResponse,
    val similarHouseholds: List<HouseholdResponse>,
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

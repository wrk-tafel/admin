package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.country.Country
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class HouseholdListResponse(
    val items: List<Household>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class HouseholdCreationResponse(
    val data: Household,
    val errorMsg: String?,
)

@ExcludeFromTestCoverage
data class HouseholdUpdateResponse(
    val data: Household,
    val errorMsg: String?,
)

@ExcludeFromTestCoverage
data class Household(
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
    val persons: List<Person> = emptyList()
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
    val lastname: String
)

@ExcludeFromTestCoverage
data class HouseholdAddress(
    val street: String?,
    val houseNumber: String?,
    val stairway: String? = null,
    val door: String? = null,
    val postalCode: Int?,
    val city: String?
)

@ExcludeFromTestCoverage
data class Person(
    val id: Long? = null,
    val isMainPerson: Boolean = false,
    val firstname: String?,
    val lastname: String?,
    val birthDate: LocalDate?,
    val gender: PersonGender?,
    val country: Country,
    val employer: String? = null,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null,
    val receivesFamilyBonus: Boolean = false,
    val excludeFromHousehold: Boolean = false
)

@ExcludeFromTestCoverage
data class ValidateHouseholdResponse(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal
)

@ExcludeFromTestCoverage
enum class HouseholdPdfType {
    MASTERDATA, IDCARD, COMBINED;
}

@ExcludeFromTestCoverage
enum class PersonGender {
    MALE, FEMALE;
}

@ExcludeFromTestCoverage
data class HouseholdDuplicatesResponse(
    val items: List<HouseholdDuplicationItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class HouseholdDuplicationItem(
    val household: Household,
    val similarHouseholds: List<Household>
)

@ExcludeFromTestCoverage
data class HouseholdMergeRequest(
    val sourceHouseholdIds: List<Long>
)

@ExcludeFromTestCoverage
data class HouseholdAboveLimitResponse(
    val items: List<HouseholdAboveLimitItem>
)

@ExcludeFromTestCoverage
data class HouseholdAboveLimitItem(
    val household: Household,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val amountExceededLimit: BigDecimal
)

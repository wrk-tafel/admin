package at.wrk.tafel.admin.backend.modules.customer.api.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.model.Country
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class CustomerListResponse(
    val items: List<Customer>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class Customer(
    val id: Long? = null,
    val issuer: CustomerIssuer? = null,
    val issuedAt: LocalDate? = null,
    val firstname: String?,
    val lastname: String?,
    val birthDate: LocalDate?,
    val gender: CustomerGender?,
    val country: Country,
    val address: CustomerAddress,
    val telephoneNumber: String? = null,
    val email: String? = null,
    val employer: String?,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null,
    val validUntil: LocalDate? = null,
    val locked: Boolean? = null,
    val lockedAt: LocalDateTime? = null,
    val lockedBy: String? = null,
    val lockReason: String? = null,
    val additionalPersons: List<CustomerAdditionalPerson> = emptyList()
)

@ExcludeFromTestCoverage
data class CustomerIssuer(
    val personnelNumber: String,
    val firstname: String,
    val lastname: String
)

@ExcludeFromTestCoverage
data class CustomerAddress(
    val street: String?,
    val houseNumber: String?,
    val stairway: String? = null,
    val door: String? = null,
    val postalCode: Int?,
    val city: String?
)

@ExcludeFromTestCoverage
data class CustomerAdditionalPerson(
    val id: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate?,
    val gender: CustomerGender?,
    val employer: String? = null,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null,
    val receivesFamilyBonus: Boolean,
    val country: Country,
    val excludeFromHousehold: Boolean = false
)

@ExcludeFromTestCoverage
data class ValidateCustomerResponse(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal
)

@ExcludeFromTestCoverage
enum class CustomerPdfType {
    MASTERDATA, IDCARD, COMBINED;
}

@ExcludeFromTestCoverage
enum class CustomerGender {
    MALE, FEMALE;
}

@ExcludeFromTestCoverage
data class CustomerDuplicatesResponse(
    val items: List<CustomerDuplicationItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class CustomerDuplicationItem(
    val customer: Customer,
    val similarCustomers: List<Customer>
)

@ExcludeFromTestCoverage
data class CustomerMergeRequest(
    val sourceCustomerIds: List<Long>
)

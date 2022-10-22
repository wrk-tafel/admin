package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.modules.base.Country
import java.math.BigDecimal
import java.time.LocalDate

@ExcludeFromTestCoverage
data class CustomerListResponse(
    val items: List<Customer>
)

@ExcludeFromTestCoverage
data class Customer(
    val id: Long? = null,
    val issuer: CustomerIssuer? = null,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val country: Country,
    val address: CustomerAddress,
    val telephoneNumber: String? = null,
    val email: String? = null,
    val employer: String,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null,
    val validUntil: LocalDate? = null,
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
    val street: String,
    val houseNumber: String,
    val stairway: String? = null,
    val door: String? = null,
    val postalCode: Int,
    val city: String
)

@ExcludeFromTestCoverage
data class CustomerAdditionalPerson(
    val id: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null
)

@ExcludeFromTestCoverage
data class ValidateCustomerResponse(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal
)

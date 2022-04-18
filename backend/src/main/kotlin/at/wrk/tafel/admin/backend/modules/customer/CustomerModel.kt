package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal
import java.time.LocalDate

@ExcludeFromTestCoverage
data class CustomerListResponse(
    val items: List<Customer>
)

@ExcludeFromTestCoverage
data class Customer(
    val id: Long? = null,
    val customerId: Long? = null,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val country: String,
    val address: CustomerAddress,
    val telephoneNumber: Long? = null,
    val email: String? = null,
    val employer: String,
    val income: BigDecimal? = null,
    val incomeDue: LocalDate? = null,
    val additionalPersons: List<CustomerAdditionalPerson> = emptyList()
)

@ExcludeFromTestCoverage
data class CustomerAddress(
    val street: String,
    val houseNumber: String,
    val stairway: String? = null,
    val door: String,
    val postalCode: Int,
    val city: String
)

@ExcludeFromTestCoverage
data class CustomerAdditionalPerson(
    val id: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val income: BigDecimal? = null
)

@ExcludeFromTestCoverage
data class ValidateCustomerResponse(
    val valid: Boolean,
    val totalSum: BigDecimal,
    val limit: BigDecimal,
    val toleranceValue: BigDecimal,
    val amountExceededLimit: BigDecimal
)

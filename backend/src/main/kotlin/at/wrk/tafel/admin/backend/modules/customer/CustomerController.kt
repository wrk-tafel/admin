package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.CustomerRepository
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerController(
    private val customerRepository: CustomerRepository
) {
    @GetMapping
    fun listCustomers(): CustomerListResponse {
        val customerItems = customerRepository.findAll().map { customerEntity ->
            Customer(
                id = customerEntity.id!!,
                firstname = customerEntity.firstname!!,
                lastname = customerEntity.lastname!!,
                birthDate = customerEntity.birthDate!!,
                address = CustomerAddress(
                    street = customerEntity.addressStreet!!,
                    houseNumber = customerEntity.addressHouseNumber!!,
                    stairway = customerEntity.addressStairway!!,
                    door = customerEntity.addressDoor!!,
                    postalCode = customerEntity.addressPostalCode!!,
                    city = customerEntity.addressCity!!
                ),
                telephoneNumber = customerEntity.telephoneNumber,
                email = customerEntity.email,
                employer = customerEntity.employer,
                income = customerEntity.income,
                incomeDue = customerEntity.incomeDue,
                additionalPersons = customerEntity.additionalPersons.map {
                    CustomerAdditionalPerson(
                        id = it.id!!,
                        firstname = it.firstname!!,
                        lastname = it.lastname!!,
                        birthDate = it.birthDate!!,
                        income = it.income
                    )
                }
            )
        }
        return CustomerListResponse(items = customerItems)
    }
}

@ExcludeFromTestCoverage
data class CustomerListResponse(
    val items: List<Customer>
)

@ExcludeFromTestCoverage
data class Customer(
    val id: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val address: CustomerAddress,
    val telephoneNumber: Long? = null,
    val email: String? = null,
    val employer: String? = null,
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

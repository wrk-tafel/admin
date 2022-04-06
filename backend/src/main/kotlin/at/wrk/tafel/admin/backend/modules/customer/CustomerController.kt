package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.repositories.CustomerRepository
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerController(
    private val customerRepository: CustomerRepository
) {
    @GetMapping
    fun listCustomers(): List<Customer> {
        return customerRepository.findAll().map {
            Customer(
                id = it.id!!,
                firstname = it.firstname!!,
                lastname = it.lastname!!,
                birthDate = it.birthDate!!,
                address = CustomerAddress(
                    street = it.addressStreet!!,
                    houseNumber = it.addressHouseNumber!!,
                    stairway = it.addressStairway!!,
                    door = it.addressDoor!!,
                    postalCode = it.addressPostalCode!!,
                    city = it.addressCity!!
                ),
                telephoneNumber = it.telephoneNumber,
                email = it.email
            )
        }
    }
}

data class Customer(
    val id: Long,
    val firstname: String,
    val lastname: String,
    val birthDate: LocalDate,
    val address: CustomerAddress,
    val telephoneNumber: Long? = null,
    val email: String? = null
)

data class CustomerAddress(
    val street: String,
    val houseNumber: String,
    val stairway: String? = null,
    val door: String,
    val postalCode: Int,
    val city: String
)

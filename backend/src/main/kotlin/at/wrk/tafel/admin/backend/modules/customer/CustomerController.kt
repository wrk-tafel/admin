package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.repositories.CustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerController(
    private val customerRepository: CustomerRepository,
    private val incomeValidatorService: IncomeValidatorService
) {
    @PostMapping("/validate")
    fun validate(@RequestBody customer: Customer): ValidateCustomerResponse {
        val result = incomeValidatorService.validate(mapToValidationPersons(customer))
        return ValidateCustomerResponse(result.valid)
    }

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

    private fun mapToValidationPersons(customer: Customer): List<IncomeValidatorPerson> {
        val personList = mutableListOf<IncomeValidatorPerson>()
        personList.add(
            IncomeValidatorPerson(
                monthlyIncome = customer.income,
                birthDate = customer.birthDate
            )
        )

        customer.additionalPersons.forEach {
            personList.add(
                IncomeValidatorPerson(
                    monthlyIncome = it.income,
                    birthDate = it.birthDate
                )
            )
        }

        return personList
    }
}

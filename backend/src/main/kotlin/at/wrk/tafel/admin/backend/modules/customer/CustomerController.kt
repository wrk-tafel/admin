package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
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
        return ValidateCustomerResponse(
            valid = result.valid,
            totalSum = result.totalSum,
            limit = result.limit,
            toleranceValue = result.toleranceValue,
            amountExceededLimit = result.amountExceededLimit
        )
    }

    @PostMapping
    fun createCustomer(@RequestBody customer: Customer) {
        val entity = mapRequestToEntity(customer)
        customerRepository.save(entity)
    }

    @GetMapping
    fun listCustomers(): CustomerListResponse {
        val customerItems = customerRepository.findAll().map { customerEntity ->
            mapEntityToResponse(customerEntity)
        }
        return CustomerListResponse(items = customerItems)
    }

    private fun mapRequestToEntity(customer: Customer): CustomerEntity {
        val entity = CustomerEntity()
        entity.lastname = customer.lastname.trim()
        entity.firstname = customer.firstname.trim()
        entity.birthDate = customer.birthDate
        entity.addressStreet = customer.address.street.trim()
        entity.addressHouseNumber = customer.address.houseNumber.trim()
        entity.addressStairway = customer.address.stairway?.trim()
        entity.addressDoor = customer.address.door.trim()
        entity.addressPostalCode = customer.address.postalCode
        entity.addressCity = customer.address.city.trim()
        entity.telephoneNumber = customer.telephoneNumber
        entity.email = customer.email?.trim()
        entity.employer = customer.employer.trim()
        entity.income = customer.income
        entity.incomeDue = customer.incomeDue

        // TODO save customer separately and update addPersons? cascade?
        entity.additionalPersons = customer.additionalPersons.map {
            val addPersonEntity = CustomerAddPersonEntity()
            addPersonEntity.lastname = it.lastname
            addPersonEntity.firstname = it.firstname
            addPersonEntity.birthDate = it.birthDate
            addPersonEntity.income = it.income
            addPersonEntity
        }.toSet()

        return entity
    }

    private fun mapEntityToResponse(customerEntity: CustomerEntity) =
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
            employer = customerEntity.employer!!,
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

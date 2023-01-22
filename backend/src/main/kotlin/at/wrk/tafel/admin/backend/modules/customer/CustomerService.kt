package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.masterdata.CustomerPdfService
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class CustomerService(
    private val incomeValidatorService: IncomeValidatorService,
    private val customerRepository: CustomerRepository,
    private val customerAddPersonRepository: CustomerAddPersonRepository,
    private val countryRepository: CountryRepository,
    private val userRepository: UserRepository,
    private val customerPdfService: CustomerPdfService
) {
    fun validate(customer: Customer): IncomeValidatorResult {
        return incomeValidatorService.validate(mapToValidationPersons(customer))
    }

    fun existsByCustomerId(customerId: Long): Boolean {
        return customerRepository.existsByCustomerId(customerId)
    }

    fun findByCustomerId(customerId: Long): Customer? {
        val entity = customerRepository.findByCustomerId(customerId)
        if (entity.isPresent) {
            return mapEntityToResponse(entity.get())
        }
        return null
    }

    fun createCustomer(customer: Customer): Customer {
        val entity = mapRequestToEntity(customer)
        val savedEntity = customerRepository.save(entity)
        return mapEntityToResponse(savedEntity)
    }

    fun updateCustomer(customerId: Long, customer: Customer): Customer {
        val entity = mapRequestToEntity(customer, customerRepository.getReferenceByCustomerId(customerId))
        val savedEntity = customerRepository.save(entity)
        return mapEntityToResponse(savedEntity)
    }

    fun getCustomers(firstname: String? = null, lastname: String? = null): List<Customer> {
        val customerItems: List<CustomerEntity> =
            if (firstname?.isNotBlank() == true && lastname?.isNotBlank() == true) {
                customerRepository.findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(
                    firstname,
                    lastname
                )
            } else if (firstname?.isNotBlank() == true) {
                customerRepository.findAllByFirstnameContainingIgnoreCase(firstname)
            } else if (lastname?.isNotBlank() == true) {
                customerRepository.findAllByLastnameContainingIgnoreCase(lastname)
            } else {
                customerRepository.findAll()
            }

        return customerItems.map { mapEntityToResponse(it) }
    }

    fun generatePdf(customerId: Long, type: CustomerPdfType): CustomerPdfResult? {
        val customerOptional = customerRepository.findByCustomerId(customerId)
        if (customerOptional.isPresent) {
            val customer = customerOptional.get()
            var filenamePrefix: String
            var bytes: ByteArray

            when (type) {
                CustomerPdfType.MASTERDATA -> {
                    filenamePrefix = "stammdaten"
                    bytes = customerPdfService.generateMasterdataPdf(customer)
                }

                CustomerPdfType.IDCARD -> {
                    filenamePrefix = "ausweis"
                    bytes = customerPdfService.generateIdCardPdf(customer)
                }

                CustomerPdfType.COMBINED -> {
                    filenamePrefix = "stammdaten-ausweis"
                    bytes = customerPdfService.generateCombinedPdf(customer)
                }
            }

            val filename =
                "$filenamePrefix-${customer.customerId}-${customer.lastname}-${customer.firstname}"
                    .lowercase()
                    .replace("[^A-Za-z0-9]".toRegex(), "-") + ".pdf"
            return CustomerPdfResult(filename = filename, bytes = bytes)
        }
        return null
    }

    private fun mapToValidationPersons(customer: Customer): List<IncomeValidatorPerson> {
        val personList = mutableListOf<IncomeValidatorPerson>()
        personList.add(
            IncomeValidatorPerson(
                monthlyIncome = customer.income, birthDate = customer.birthDate
            )
        )

        customer.additionalPersons.forEach {
            personList.add(
                IncomeValidatorPerson(
                    monthlyIncome = it.income, birthDate = it.birthDate
                )
            )
        }

        return personList
    }

    private fun mapRequestToEntity(customer: Customer, entity: CustomerEntity? = null): CustomerEntity {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val customerEntity = entity ?: CustomerEntity()

        customerEntity.customerId = customer.id ?: customerRepository.getNextCustomerSequenceValue()
        customerEntity.issuer = customerEntity.issuer ?: userRepository.findByUsername(user.username!!).get()
        customerEntity.lastname = customer.lastname.trim()
        customerEntity.firstname = customer.firstname.trim()
        customerEntity.birthDate = customer.birthDate
        customerEntity.country = countryRepository.findById(customer.country.id).get()
        customerEntity.addressStreet = customer.address.street.trim()
        customerEntity.addressHouseNumber = customer.address.houseNumber.trim()
        customerEntity.addressStairway = customer.address.stairway?.trim()
        customerEntity.addressDoor = customer.address.door?.trim()
        customerEntity.addressPostalCode = customer.address.postalCode
        customerEntity.addressCity = customer.address.city.trim()
        customerEntity.telephoneNumber = customer.telephoneNumber
        customerEntity.email = customer.email?.takeIf { it.isNotBlank() }?.trim()
        customerEntity.employer = customer.employer.trim()
        customerEntity.income = customer.income
        customerEntity.incomeDue = customer.incomeDue
        customerEntity.validUntil = customer.validUntil

        customerEntity.additionalPersons.clear()
        customerEntity.additionalPersons.addAll(
            customer.additionalPersons.map {
                val addPersonEntity =
                    customerAddPersonRepository.findById(it.id).orElseGet { CustomerAddPersonEntity() }
                addPersonEntity.customer = customerEntity
                addPersonEntity.lastname = it.lastname.trim()
                addPersonEntity.firstname = it.firstname.trim()
                addPersonEntity.birthDate = it.birthDate
                addPersonEntity.income = it.income
                addPersonEntity.incomeDue = it.incomeDue
                addPersonEntity.country = countryRepository.findById(it.country.id).get()
                addPersonEntity
            }.toList()
        )

        return customerEntity
    }

    private fun mapEntityToResponse(customerEntity: CustomerEntity) = Customer(
        id = customerEntity.customerId,
        issuer = customerEntity.issuer?.let {
            CustomerIssuer(
                personnelNumber = it.personnelNumber!!,
                firstname = it.firstname!!,
                lastname = it.lastname!!
            )
        },
        issuedAt = customerEntity.createdAt!!.toLocalDate(),
        firstname = customerEntity.firstname!!,
        lastname = customerEntity.lastname!!,
        birthDate = customerEntity.birthDate!!,
        country = mapCountryToResponse(customerEntity.country!!),
        address = CustomerAddress(
            street = customerEntity.addressStreet!!,
            houseNumber = customerEntity.addressHouseNumber!!,
            stairway = customerEntity.addressStairway,
            door = customerEntity.addressDoor,
            postalCode = customerEntity.addressPostalCode!!,
            city = customerEntity.addressCity!!
        ),
        telephoneNumber = customerEntity.telephoneNumber,
        email = customerEntity.email,
        employer = customerEntity.employer!!,
        income = customerEntity.income,
        incomeDue = customerEntity.incomeDue,
        validUntil = customerEntity.validUntil,
        additionalPersons = customerEntity.additionalPersons.map {
            CustomerAdditionalPerson(
                id = it.id!!,
                firstname = it.firstname!!,
                lastname = it.lastname!!,
                birthDate = it.birthDate!!,
                income = it.income,
                incomeDue = it.incomeDue,
                country = mapCountryToResponse(it.country!!)
            )
        }
    )

    private fun mapCountryToResponse(country: CountryEntity): Country {
        return Country(
            id = country.id!!,
            code = country.code!!,
            name = country.name!!
        )
    }

}

@ExcludeFromTestCoverage
data class CustomerPdfResult(
    val filename: String,
    val bytes: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as CustomerPdfResult

        if (filename != other.filename) return false
        if (!bytes.contentEquals(other.bytes)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

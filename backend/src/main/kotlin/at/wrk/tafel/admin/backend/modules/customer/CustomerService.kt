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
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.ZonedDateTime

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
        return customerRepository.findByCustomerId(customerId)?.let { mapEntityToResponse(it) }
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
        val customer = customerRepository.findByCustomerId(customerId)
        if (customer != null) {
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
                monthlyIncome = customer.income,
                birthDate = customer.birthDate,
                excludeFromIncomeCalculation = false
            )
        )

        customer.additionalPersons.forEach {
            personList.add(
                IncomeValidatorPerson(
                    monthlyIncome = it.income,
                    birthDate = it.birthDate,
                    excludeFromIncomeCalculation = it.excludeFromHousehold
                )
            )
        }

        return personList
    }

    private fun mapRequestToEntity(customer: Customer, entity: CustomerEntity? = null): CustomerEntity {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val userEntity = userRepository.findByUsername(user.username!!).get()
        val customerEntity = entity ?: CustomerEntity()

        customerEntity.customerId = customer.id ?: customerRepository.getNextCustomerSequenceValue()
        customerEntity.issuer = customerEntity.issuer ?: userEntity
        customerEntity.lastname = customer.lastname.trim()
        customerEntity.firstname = customer.firstname.trim()
        customerEntity.birthDate = customer.birthDate
        customerEntity.country = countryRepository.findById(customer.country.id).get()
        customerEntity.addressStreet = customer.address.street.trim()
        customerEntity.addressHouseNumber = customer.address.houseNumber?.trim()
        customerEntity.addressStairway = customer.address.stairway?.trim()
        customerEntity.addressDoor = customer.address.door?.trim()
        customerEntity.addressPostalCode = customer.address.postalCode
        customerEntity.addressCity = customer.address.city?.trim()
        customerEntity.telephoneNumber = customer.telephoneNumber
        customerEntity.email = customer.email?.takeIf { it.isNotBlank() }?.trim()
        customerEntity.employer = customer.employer.trim()
        customerEntity.income = customer.income.takeIf { it != null && it > BigDecimal.ZERO }
        customerEntity.incomeDue = customer.incomeDue
        customerEntity.validUntil = customer.validUntil

        if (customer.locked == true) {
            customerEntity.locked = true
            customerEntity.lockedAt = ZonedDateTime.now()
            customerEntity.lockedBy = userEntity
            customerEntity.lockReason = customer.lockReason
        } else {
            customerEntity.locked = false
            customerEntity.lockedAt = null
            customerEntity.lockedBy = null
            customerEntity.lockReason = null
        }

        // TODO revisit on 01.01.2024 if still necessary
        // once the customer was updated/fixed the required fields - migration is done
        customerEntity.migrated = false

        customerEntity.additionalPersons.clear()
        customerEntity.additionalPersons.addAll(
            customer.additionalPersons.map {
                val addPersonEntity =
                    customerAddPersonRepository.findById(it.id).orElseGet { CustomerAddPersonEntity() }
                addPersonEntity.customer = customerEntity
                addPersonEntity.lastname = it.lastname.trim()
                addPersonEntity.firstname = it.firstname.trim()
                addPersonEntity.birthDate = it.birthDate
                addPersonEntity.employer = it.employer
                addPersonEntity.income = it.income.takeIf { income -> income != null && income > BigDecimal.ZERO }
                addPersonEntity.incomeDue = it.incomeDue
                addPersonEntity.receivesFamilyBonus = it.receivesFamilyBonus
                addPersonEntity.country = countryRepository.findById(it.country.id).get()
                addPersonEntity.excludeFromHousehold = it.excludeFromHousehold
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
            houseNumber = customerEntity.addressHouseNumber,
            stairway = customerEntity.addressStairway,
            door = customerEntity.addressDoor,
            postalCode = customerEntity.addressPostalCode,
            city = customerEntity.addressCity
        ),
        telephoneNumber = customerEntity.telephoneNumber,
        email = customerEntity.email,
        employer = customerEntity.employer!!,
        income = customerEntity.income,
        incomeDue = customerEntity.incomeDue,
        validUntil = customerEntity.validUntil,
        locked = customerEntity.locked,
        lockedAt = customerEntity.lockedAt,
        lockedBy = customerEntity.lockedBy?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" },
        lockReason = customerEntity.lockReason,
        additionalPersons = customerEntity.additionalPersons.map {
            CustomerAdditionalPerson(
                id = it.id!!,
                firstname = it.firstname!!,
                lastname = it.lastname!!,
                birthDate = it.birthDate!!,
                employer = it.employer,
                income = it.income,
                incomeDue = it.incomeDue,
                receivesFamilyBonus = it.receivesFamilyBonus!!,
                country = mapCountryToResponse(it.country!!),
                excludeFromHousehold = it.excludeFromHousehold!!
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

    @Transactional
    fun deleteCustomerByCustomerId(customerId: Long) {
        customerRepository.deleteByCustomerId(customerId)
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
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

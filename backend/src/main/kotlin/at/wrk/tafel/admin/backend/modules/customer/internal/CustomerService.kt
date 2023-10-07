package at.wrk.tafel.admin.backend.modules.customer.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.firstnameContains
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.lastnameContains
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.orderByUpdatedAtDesc
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.internal.masterdata.CustomerPdfService
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime


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

    @Transactional
    fun findByCustomerId(customerId: Long): Customer? {
        return customerRepository.findByCustomerId(customerId)?.let { mapEntityToResponse(it) }
    }

    fun createCustomer(customer: Customer): Customer {
        val entity = mapRequestToEntity(customer)
        val savedEntity = customerRepository.save(entity)
        return mapEntityToResponse(savedEntity)
    }

    @Transactional
    fun updateCustomer(customerId: Long, customer: Customer): Customer {
        val entity = mapRequestToEntity(customer, customerRepository.getReferenceByCustomerId(customerId))

        // When a customer is updated with an invalid income - force set him invalid
        val validationResult = incomeValidatorService.validate(mapToValidationPersons(customer))
        if (!validationResult.valid) {
            entity.validUntil = LocalDate.now().minusDays(1)
        }

        val savedEntity = customerRepository.save(entity)
        return mapEntityToResponse(savedEntity)
    }

    @Transactional
    fun getCustomers(firstname: String? = null, lastname: String? = null, pageIndex: Int?): CustomerSearchResult {
        val usedPageIndex = pageIndex ?: 0
        val pageRequest = PageRequest.of(usedPageIndex, 25)
        val spec = orderByUpdatedAtDesc(where(firstnameContains(firstname)).and(lastnameContains(lastname)))
        val pagedResult = customerRepository.findAll(spec, pageRequest)

        return CustomerSearchResult(
            items = pagedResult.map { mapEntityToResponse(it) }.toList(),
            totalCount = pagedResult.totalElements,
            pageIndex = usedPageIndex,
            totalPages = pagedResult.totalPages
        )
    }

    @Transactional
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
        val customerPerson = IncomeValidatorPerson(
            monthlyIncome = customer.income,
            birthDate = customer.birthDate,
            excludeFromIncomeCalculation = false
        )

        val addPersonList = customer.additionalPersons.map {
            IncomeValidatorPerson(
                monthlyIncome = it.income,
                birthDate = it.birthDate,
                excludeFromIncomeCalculation = it.excludeFromHousehold,
                receivesFamilyBonus = it.receivesFamilyBonus
            )
        }

        return addPersonList + customerPerson
    }

    private fun mapRequestToEntity(customerUpdate: Customer, storedEntity: CustomerEntity? = null): CustomerEntity {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val userEntity = userRepository.findByUsername(user.username!!)
        val customerEntity = storedEntity ?: CustomerEntity()

        customerEntity.customerId = customerUpdate.id ?: customerRepository.getNextCustomerSequenceValue()
        customerEntity.issuer = customerEntity.issuer ?: userEntity
        customerEntity.lastname = customerUpdate.lastname.trim()
        customerEntity.firstname = customerUpdate.firstname.trim()
        customerEntity.birthDate = customerUpdate.birthDate
        customerEntity.country = countryRepository.findById(customerUpdate.country.id).get()
        customerEntity.addressStreet = customerUpdate.address.street.trim()
        customerEntity.addressHouseNumber = customerUpdate.address.houseNumber?.trim()
        customerEntity.addressStairway = customerUpdate.address.stairway?.trim()
        customerEntity.addressDoor = customerUpdate.address.door?.trim()
        customerEntity.addressPostalCode = customerUpdate.address.postalCode
        customerEntity.addressCity = customerUpdate.address.city?.trim()
        customerEntity.telephoneNumber = customerUpdate.telephoneNumber
        customerEntity.email = customerUpdate.email?.takeIf { it.isNotBlank() }?.trim()
        customerEntity.employer = customerUpdate.employer.trim()
        customerEntity.income = customerUpdate.income.takeIf { it != null && it > BigDecimal.ZERO }
        customerEntity.incomeDue = customerUpdate.incomeDue

        val prolongedAt =
            if (storedEntity?.validUntil != null
                && customerUpdate.validUntil != null
                && customerUpdate.validUntil.isAfter(storedEntity.validUntil)
            ) LocalDateTime.now() else null
        customerEntity.prolongedAt = prolongedAt
        customerEntity.validUntil = customerUpdate.validUntil

        if (customerUpdate.locked == true) {
            customerEntity.locked = true
            customerEntity.lockedAt = LocalDateTime.now()
            customerEntity.lockedBy = userEntity
            customerEntity.lockReason = customerUpdate.lockReason
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
            customerUpdate.additionalPersons.map {
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
        }.sortedBy { "${it.lastname} ${it.firstname}" }
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

data class CustomerSearchResult(
    val items: List<Customer>,
    val totalCount: Long,
    val pageIndex: Int,
    val totalPages: Int
)

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

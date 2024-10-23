package at.wrk.tafel.admin.backend.modules.customer.service.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.firstnameContains
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.lastnameContains
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.orderByUpdatedAtDesc
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity.Specs.Companion.postProcessingNecessary
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.modules.customer.api.model.Customer
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerPdfType
import at.wrk.tafel.admin.backend.modules.customer.service.internal.converter.CustomerConverter
import at.wrk.tafel.admin.backend.modules.customer.service.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.service.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.customer.service.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.service.internal.masterdata.CustomerPdfInternalService
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class CustomerService(
    private val incomeValidatorService: IncomeValidatorService,
    private val customerRepository: CustomerRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository,
    private val customerPdfInternalService: CustomerPdfInternalService,
    private val customerConverter: CustomerConverter
) {

    fun validate(customer: Customer): IncomeValidatorResult {
        return incomeValidatorService.validate(mapToValidationPersons(customer))
    }

    fun existsByCustomerId(customerId: Long): Boolean {
        return customerRepository.existsByCustomerId(customerId)
    }

    @Transactional
    fun findByCustomerId(customerId: Long): Customer? {
        return customerRepository.findByCustomerId(customerId)?.let { customerConverter.mapEntityToCustomer(it) }
    }

    fun createCustomer(customer: Customer): Customer {
        val entity = customerConverter.mapCustomerToEntity(customer)
        val savedEntity = customerRepository.save(entity)
        return customerConverter.mapEntityToCustomer(savedEntity)
    }

    @Transactional
    fun updateCustomer(customerId: Long, customer: Customer): Customer {
        val existingEntity = customerRepository.getReferenceByCustomerId(customerId)
        val mappedEntity = customerConverter.mapCustomerToEntity(customer, existingEntity)

        // When a customer is updated with an invalid income - force set him invalid
        val validationResult = incomeValidatorService.validate(mapToValidationPersons(customer))
        if (!validationResult.valid) {
            mappedEntity.validUntil = LocalDate.now().minusDays(1)
        }

        val savedEntity = customerRepository.save(mappedEntity)
        return customerConverter.mapEntityToCustomer(savedEntity)
    }

    @Transactional
    fun getCustomers(
        firstname: String? = null,
        lastname: String? = null,
        page: Int?,
        postProcessing: Boolean?
    ): CustomerSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 25)

        val where = where(
            Specification.allOf(
                firstnameContains(firstname),
                lastnameContains(lastname),
                if (postProcessing != null) postProcessingNecessary() else null
            )
        )

        val spec = orderByUpdatedAtDesc(where)
        val pagedResult = customerRepository.findAll(spec, pageRequest)

        return CustomerSearchResult(
            items = pagedResult.map { customerConverter.mapEntityToCustomer(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize
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
                    bytes = customerPdfInternalService.generateMasterdataPdf(customer)
                }

                CustomerPdfType.IDCARD -> {
                    filenamePrefix = "ausweis"
                    bytes = customerPdfInternalService.generateIdCardPdf(customer)
                }

                CustomerPdfType.COMBINED -> {
                    filenamePrefix = "stammdaten-ausweis"
                    bytes = customerPdfInternalService.generateCombinedPdf(customer)
                }
            }

            val customerName =
                listOfNotNull(
                    customer.customerId,
                    customer.lastname,
                    customer.firstname
                ).joinToString("-") { it.toString() }
            val filename = "$filenamePrefix-$customerName".lowercase().replace("[^A-Za-z0-9]".toRegex(), "-") + ".pdf"
            return CustomerPdfResult(filename = filename, bytes = bytes)
        }
        return null
    }

    @Transactional
    fun deleteCustomerByCustomerId(customerId: Long) {
        customerRepository.deleteByCustomerId(customerId)
    }

    private fun mapToValidationPersons(customer: Customer): List<IncomeValidatorPerson> {
        val customerPerson = IncomeValidatorPerson(
            birthDate = customer.birthDate!!,
            monthlyIncome = customer.income,
            excludeFromIncomeCalculation = false
        )

        val addPersonList = customer.additionalPersons.map {
            IncomeValidatorPerson(
                birthDate = it.birthDate,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = it.excludeFromHousehold,
                receivesFamilyBonus = it.receivesFamilyBonus
            )
        }

        return addPersonList + customerPerson
    }

    @Transactional
    fun mergeCustomers(targetCustomer: Long, sourceCustomers: List<Long>) {
        // TODO for a long-term usage:
        // add migration of notes
        // add migration of visits (customers_distributions table)

        sourceCustomers.forEach { customerId ->
            customerRepository.deleteByCustomerId(customerId)
        }
    }

}

@ExcludeFromTestCoverage
data class CustomerSearchResult(
    val items: List<Customer>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
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

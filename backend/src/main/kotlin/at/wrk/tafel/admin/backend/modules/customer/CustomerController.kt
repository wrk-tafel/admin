package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.masterdata.CustomerPdfService
import at.wrk.tafel.admin.backend.security.model.TafelUser
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerController(
    private val customerRepository: CustomerRepository,
    private val customerAddPersonRepository: CustomerAddPersonRepository,
    private val countryRepository: CountryRepository,
    private val incomeValidatorService: IncomeValidatorService,
    private val customerPdfService: CustomerPdfService,
    private val userRepository: UserRepository
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
    fun createCustomer(@RequestBody customer: Customer): Customer {
        customer.id?.let {
            if (customerRepository.existsByCustomerId(it)) {
                throw ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Kunde Nr. $it bereits vorhanden!")
            }
        }

        val entity = mapRequestToEntity(customer)
        val savedEntity = customerRepository.save(entity)
        return mapEntityToResponse(savedEntity)
    }

    @PostMapping("/{id}")
    fun updateCustomer(
        @PathVariable("id") customerId: Long,
        @RequestBody customer: Customer
    ): Customer {
        if (!customerRepository.existsByCustomerId(customerId)) {
            throw ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Kunde Nr. $customerId nicht vorhanden!")
        }

        val entity = mapRequestToEntity(customer, customerRepository.getReferenceByCustomerId(customerId))
        val savedEntity = customerRepository.save(entity)
        return mapEntityToResponse(savedEntity)
    }

    @GetMapping("/{customerId}")
    fun getCustomer(@PathVariable("customerId") customerId: Long): Customer {
        val entity = customerRepository.findByCustomerId(customerId)
        if (entity.isPresent) {
            return mapEntityToResponse(entity.get())
        }
        throw ResponseStatusException(HttpStatus.NOT_FOUND)
    }

    @GetMapping
    fun getCustomers(
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null
    ): CustomerListResponse {
        var customerItems: List<CustomerEntity> =
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

        return CustomerListResponse(items = customerItems.map { customerEntity -> mapEntityToResponse(customerEntity) })
    }

    @GetMapping("/{customerId}/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generatePdf(
        @PathVariable("customerId") customerId: Long,
        @RequestParam("type") type: CustomerPdfType
    ): ResponseEntity<InputStreamResource> {
        return when (type) {
            CustomerPdfType.MASTERDATA -> generatePdfResponse(
                customerId,
                "stammdaten",
                customerPdfService::generateMasterdataPdf
            )

            CustomerPdfType.IDCARD -> generatePdfResponse(customerId, "ausweis", customerPdfService::generateIdCardPdf)
            CustomerPdfType.COMBINED -> generatePdfResponse(
                customerId,
                "stammdaten-ausweis",
                customerPdfService::generateCombinedPdf
            )
        }
    }

    private fun generatePdfResponse(
        customerId: Long,
        filenamePrefix: String,
        getPdfBytes: (customer: CustomerEntity) -> ByteArray
    ): ResponseEntity<InputStreamResource> {
        val customerOptional = customerRepository.findByCustomerId(customerId)
        if (customerOptional.isPresent) {
            val customer = customerOptional.get()
            val pdfFilename =
                "$filenamePrefix-${customer.customerId}-${customer.lastname}-${customer.firstname}"
                    .lowercase()
                    .replace("[^A-Za-z0-9]".toRegex(), "-") + ".pdf"

            val headers = HttpHeaders()
            headers.add(
                HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=$pdfFilename"
            )

            val pdfBytes = getPdfBytes(customer)
            return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(InputStreamResource(ByteArrayInputStream(pdfBytes)))
        }
        return ResponseEntity.notFound().build()
    }

    private fun mapRequestToEntity(customer: Customer, entity: CustomerEntity? = null): CustomerEntity {
        val user = SecurityContextHolder.getContext().authentication.principal as TafelUser
        val customerEntity = entity ?: CustomerEntity()

        customerEntity.customerId = customer.id ?: customerRepository.getNextCustomerSequenceValue()
        customerEntity.issuer = customerEntity.issuer ?: userRepository.getReferenceById(user.id)
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
        firstname = customerEntity.firstname!!,
        lastname = customerEntity.lastname!!,
        birthDate = customerEntity.birthDate!!,
        country = mapCustomerCountryToResponse(customerEntity.country!!),
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
                incomeDue = it.incomeDue
            )
        }
    )

    private fun mapCustomerCountryToResponse(country: CountryEntity): Country {
        return Country(
            id = country.id!!,
            code = country.code!!,
            name = country.name!!
        )
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
}

enum class CustomerPdfType {
    MASTERDATA, IDCARD, COMBINED;
}

package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.customer.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.customer.masterdata.MasterdataPdfAddressData
import at.wrk.tafel.admin.backend.modules.customer.masterdata.MasterdataPdfCustomer
import at.wrk.tafel.admin.backend.modules.customer.masterdata.MasterdataPdfService
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerController(
    private val customerRepository: CustomerRepository,
    private val countryRepository: CountryRepository,
    private val incomeValidatorService: IncomeValidatorService,
    private val masterdataPdfService: MasterdataPdfService
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

    @GetMapping("/{customerId}")
    fun getCustomer(@PathVariable("customerId") customerId: Long): Customer {
        val entity = customerRepository.findByCustomerId(customerId)
        if (entity.isPresent) {
            return mapEntityToResponse(entity.get())
        }
        throw ResponseStatusException(HttpStatus.NOT_FOUND)
    }

    @GetMapping
    fun listCustomers(): CustomerListResponse {
        val customerItems = customerRepository.findAll().map { customerEntity ->
            mapEntityToResponse(customerEntity)
        }
        return CustomerListResponse(items = customerItems)
    }

    @GetMapping("/{customerId}/generate-masterdata-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generateMasterdataPdf(@PathVariable("customerId") customerId: Long): ResponseEntity<InputStreamResource> {
        val customerOptional = customerRepository.findByCustomerId(customerId)
        if (customerOptional.isPresent) {
            val customer = customerOptional.get()
            val pdfFilename =
                "stammdaten-${customer.customerId}-${customer.lastname}-${customer.firstname}"
                    .lowercase()
                    .replace("[^A-Za-z0-9]".toRegex(), "-") + ".pdf"

            val pdfBytes = masterdataPdfService.generatePdf(mapToPdfData(customer))

            val headers = HttpHeaders()
            headers.add(
                HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=$pdfFilename"
            )

            return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(InputStreamResource(ByteArrayInputStream(pdfBytes)))
        }
        return ResponseEntity.notFound().build()
    }

    private fun mapToPdfData(customer: CustomerEntity): MasterdataPdfCustomer {
        return MasterdataPdfCustomer(
            id = customer.customerId!!,
            lastname = customer.lastname!!,
            firstname = customer.firstname!!,
            birthDate = customer.birthDate!!,
            telephoneNumber = customer.telephoneNumber,
            email = customer.email,
            address = MasterdataPdfAddressData(
                street = customer.addressStreet!!,
                houseNumber = customer.addressHouseNumber!!,
                door = customer.addressDoor!!,
                stairway = customer.addressStairway,
                postalCode = customer.addressPostalCode!!,
                city = customer.addressCity!!
            ),
            employer = customer.employer!!
        )
    }

    private fun mapRequestToEntity(customer: Customer): CustomerEntity {
        val customerEntity = CustomerEntity()
        customerEntity.customerId = customer.id ?: customerRepository.getNextCustomerSequenceValue()
        customerEntity.lastname = customer.lastname.trim()
        customerEntity.firstname = customer.firstname.trim()
        customerEntity.birthDate = customer.birthDate
        customerEntity.country = countryRepository.findById(customer.country.id).get()
        customerEntity.addressStreet = customer.address.street.trim()
        customerEntity.addressHouseNumber = customer.address.houseNumber.trim()
        customerEntity.addressStairway = customer.address.stairway?.trim()
        customerEntity.addressDoor = customer.address.door.trim()
        customerEntity.addressPostalCode = customer.address.postalCode
        customerEntity.addressCity = customer.address.city.trim()
        customerEntity.telephoneNumber = customer.telephoneNumber
        customerEntity.email = customer.email?.trim()
        customerEntity.employer = customer.employer.trim()
        customerEntity.income = customer.income
        customerEntity.incomeDue = customer.incomeDue

        customerEntity.additionalPersons = customer.additionalPersons.map {
            val addPersonEntity = CustomerAddPersonEntity()
            addPersonEntity.customer = customerEntity
            addPersonEntity.lastname = it.lastname.trim()
            addPersonEntity.firstname = it.firstname.trim()
            addPersonEntity.birthDate = it.birthDate
            addPersonEntity.income = it.income
            addPersonEntity
        }.toList()

        return customerEntity
    }

    private fun mapEntityToResponse(customerEntity: CustomerEntity) = Customer(
        id = customerEntity.customerId,
        firstname = customerEntity.firstname!!,
        lastname = customerEntity.lastname!!,
        birthDate = customerEntity.birthDate!!,
        country = mapCustomerCountryToDomain(customerEntity.country!!),
        address = CustomerAddress(
            street = customerEntity.addressStreet!!,
            houseNumber = customerEntity.addressHouseNumber!!,
            stairway = customerEntity.addressStairway,
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

    private fun mapCustomerCountryToDomain(country: CountryEntity): Country {
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

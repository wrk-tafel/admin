package at.wrk.tafel.admin.backend.modules.customer.internal.converter

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.base.Gender
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.modules.customer.internal.Customer
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerAdditionalPerson
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerAddress
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerGender
import at.wrk.tafel.admin.backend.modules.customer.internal.CustomerIssuer
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDateTime

@Component
class CustomerConverter(
    private val customerRepository: CustomerRepository,
    private val customerAddPersonRepository: CustomerAddPersonRepository,
    private val countryRepository: CountryRepository,
    private val userRepository: UserRepository
) {

    fun mapCustomerToEntity(customerUpdate: Customer, storedEntity: CustomerEntity? = null): CustomerEntity {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val userEntity = userRepository.findByUsername(user.username!!)
        val customerEntity = storedEntity ?: CustomerEntity()

        customerEntity.customerId = customerUpdate.id ?: customerRepository.getNextCustomerSequenceValue()
        customerEntity.issuer = customerEntity.issuer ?: userEntity
        customerEntity.lastname = customerUpdate.lastname?.trim()
        customerEntity.firstname = customerUpdate.firstname?.trim()
        customerEntity.birthDate = customerUpdate.birthDate
        customerEntity.gender = customerUpdate.gender?.let { Gender.valueOf(it.name) }
        customerEntity.country = countryRepository.findById(customerUpdate.country.id).get()
        customerEntity.addressStreet = customerUpdate.address.street?.trim()
        customerEntity.addressHouseNumber = customerUpdate.address.houseNumber?.trim()
        customerEntity.addressStairway = customerUpdate.address.stairway?.trim()
        customerEntity.addressDoor = customerUpdate.address.door?.trim()
        customerEntity.addressPostalCode = customerUpdate.address.postalCode
        customerEntity.addressCity = customerUpdate.address.city?.trim()
        customerEntity.telephoneNumber = customerUpdate.telephoneNumber
        customerEntity.email = customerUpdate.email?.takeIf { it.isNotBlank() }?.trim()
        customerEntity.employer = customerUpdate.employer?.trim()
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
            customerUpdate.additionalPersons.map { addPerson ->
                val addPersonEntity =
                    customerAddPersonRepository.findById(addPerson.id).orElseGet { CustomerAddPersonEntity() }
                addPersonEntity.customer = customerEntity
                addPersonEntity.lastname = addPerson.lastname.trim()
                addPersonEntity.firstname = addPerson.firstname.trim()
                addPersonEntity.birthDate = addPerson.birthDate
                addPersonEntity.gender = addPerson.gender?.let { Gender.valueOf(it.name) }
                addPersonEntity.employer = addPerson.employer
                addPersonEntity.income =
                    addPerson.income.takeIf { income -> income != null && income > BigDecimal.ZERO }
                addPersonEntity.incomeDue = addPerson.incomeDue
                addPersonEntity.receivesFamilyBonus = addPerson.receivesFamilyBonus
                addPersonEntity.country = countryRepository.findById(addPerson.country.id).get()
                addPersonEntity.excludeFromHousehold = addPerson.excludeFromHousehold
                addPersonEntity
            }.toList()
        )

        return customerEntity
    }

    fun mapEntityToCustomer(customerEntity: CustomerEntity) = Customer(
        id = customerEntity.customerId,
        issuer = customerEntity.issuer?.let {
            CustomerIssuer(
                personnelNumber = it.employee!!.personnelNumber!!,
                firstname = it.employee!!.firstname!!,
                lastname = it.employee!!.lastname!!
            )
        },
        issuedAt = customerEntity.createdAt!!.toLocalDate(),
        firstname = customerEntity.firstname,
        lastname = customerEntity.lastname,
        birthDate = customerEntity.birthDate,
        gender = mapGender(customerEntity.gender),
        country = mapCountryToResponse(customerEntity.country!!),
        address = CustomerAddress(
            street = customerEntity.addressStreet,
            houseNumber = customerEntity.addressHouseNumber,
            stairway = customerEntity.addressStairway,
            door = customerEntity.addressDoor,
            postalCode = customerEntity.addressPostalCode,
            city = customerEntity.addressCity
        ),
        telephoneNumber = customerEntity.telephoneNumber,
        email = customerEntity.email,
        employer = customerEntity.employer,
        income = customerEntity.income,
        incomeDue = customerEntity.incomeDue,
        validUntil = customerEntity.validUntil,
        locked = customerEntity.locked,
        lockedAt = customerEntity.lockedAt,
        lockedBy = customerEntity.lockedBy?.let { "${it.employee!!.personnelNumber} ${it.employee!!.firstname} ${it.employee!!.lastname}" },
        lockReason = customerEntity.lockReason,
        additionalPersons = customerEntity.additionalPersons.map {
            CustomerAdditionalPerson(
                id = it.id!!,
                firstname = it.firstname!!,
                lastname = it.lastname!!,
                birthDate = it.birthDate,
                gender = mapGender(it.gender),
                employer = it.employer,
                income = it.income,
                incomeDue = it.incomeDue,
                receivesFamilyBonus = it.receivesFamilyBonus!!,
                country = mapCountryToResponse(it.country!!),
                excludeFromHousehold = it.excludeFromHousehold!!
            )
        }.sortedBy { "${it.lastname} ${it.firstname}" }
    )

    private fun mapGender(gender: Gender?): CustomerGender? {
        return gender?.let { CustomerGender.valueOf(it.name) }
    }

    private fun mapCountryToResponse(country: CountryEntity): Country {
        return Country(
            id = country.id!!,
            code = country.code!!,
            name = country.name!!
        )
    }

}

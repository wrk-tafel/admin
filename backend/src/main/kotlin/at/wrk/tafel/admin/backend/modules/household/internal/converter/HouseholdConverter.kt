package at.wrk.tafel.admin.backend.modules.household.internal.converter

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.Country
import at.wrk.tafel.admin.backend.modules.household.Household
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdIssuer
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.PersonGender
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDateTime

@Component
class HouseholdConverter(
    private val householdRepository: HouseholdRepository,
    private val personRepository: PersonRepository,
    private val countryRepository: CountryRepository,
    private val userRepository: UserRepository,
) {

    fun mapHouseholdToEntity(householdUpdate: Household, storedEntity: HouseholdEntity? = null): HouseholdEntity {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val userEntity = userRepository.findByUsername(user.username!!)
        val householdEntity = storedEntity ?: HouseholdEntity()

        householdEntity.householdId = householdUpdate.id ?: householdRepository.getNextHouseholdSequenceValue()
        householdEntity.issuer = householdEntity.issuer ?: userEntity!!.employee
        householdEntity.addressStreet = householdUpdate.address.street?.trim()
        householdEntity.addressHouseNumber = householdUpdate.address.houseNumber?.trim()
        householdEntity.addressStairway = householdUpdate.address.stairway?.trim()
        householdEntity.addressDoor = householdUpdate.address.door?.trim()
        householdEntity.addressPostalCode = householdUpdate.address.postalCode
        householdEntity.addressCity = householdUpdate.address.city?.trim()
        householdEntity.telephoneNumber = householdUpdate.telephoneNumber
        householdEntity.email = householdUpdate.email?.takeIf { it.isNotBlank() }?.trim()

        val prolongedAt =
            if (storedEntity?.validUntil != null &&
                householdUpdate.validUntil != null &&
                householdUpdate.validUntil.isAfter(storedEntity.validUntil)
            ) {
                LocalDateTime.now()
            } else {
                null
            }
        householdEntity.prolongedAt = prolongedAt
        householdEntity.validUntil = householdUpdate.validUntil

        if (householdUpdate.locked == true) {
            householdEntity.locked = true
            householdEntity.lockedAt = LocalDateTime.now()
            householdEntity.lockedBy = userEntity
            householdEntity.lockReason = householdUpdate.lockReason
        } else {
            householdEntity.locked = false
            householdEntity.lockedAt = null
            householdEntity.lockedBy = null
            householdEntity.lockReason = null
        }

        // TODO revisit on 01.01.2026 if still necessary
        // once the household was updated/fixed the required fields - migration is done
        householdEntity.migrated = false

        // The main person row is always updated in place (never removed and re-created), so that
        // households.main_person_id never points at a row scheduled for orphan removal.
        val storedMainPerson = householdEntity.persons.firstOrNull { it.isMainPerson }

        val mappedPersons = householdUpdate.persons.map { person ->
            val existingEntity: PersonEntity? = if (person.isMainPerson) {
                storedMainPerson ?: person.id?.let { personRepository.findByIdOrNull(it) }
            } else {
                person.id?.let { personRepository.findByIdOrNull(it) }
            }
            val personEntity = existingEntity ?: PersonEntity()

            personEntity.household = householdEntity
            personEntity.isMainPerson = person.isMainPerson
            personEntity.lastname = person.lastname?.trim()
            personEntity.firstname = person.firstname?.trim()
            personEntity.birthDate = person.birthDate
            personEntity.gender = person.gender?.let { Gender.valueOf(it.name) }
            personEntity.country = countryRepository.findById(person.country.id).get()
            personEntity.employer = person.employer?.trim()
            personEntity.income = person.income.takeIf { income -> income != null && income > BigDecimal.ZERO }
            personEntity.incomeDue = person.incomeDue
            personEntity.receivesFamilyAllowance = person.receivesFamilyAllowance
            personEntity.excludeFromHousehold = person.excludeFromHousehold
            personEntity
        }.toList()

        householdEntity.persons.clear()
        householdEntity.persons.addAll(mappedPersons)

        return householdEntity
    }

    fun mapEntityToHousehold(householdEntity: HouseholdEntity): Household {
        val mainPersonEntity = householdEntity.mainPerson ?: householdEntity.persons.firstOrNull { it.isMainPerson }
        val additionalPersons = householdEntity.persons
            .filterNot { it.isMainPerson }
            .map { mapPerson(it) }
            .sortedBy { "${it.lastname} ${it.firstname}" }

        return Household(
            id = householdEntity.householdId,
            issuer = householdEntity.issuer?.let {
                HouseholdIssuer(
                    personnelNumber = it.personnelNumber!!,
                    firstname = it.firstname!!,
                    lastname = it.lastname!!,
                )
            },
            issuedAt = householdEntity.createdAt!!.toLocalDate(),
            address = HouseholdAddress(
                street = householdEntity.addressStreet,
                houseNumber = householdEntity.addressHouseNumber,
                stairway = householdEntity.addressStairway,
                door = householdEntity.addressDoor,
                postalCode = householdEntity.addressPostalCode,
                city = householdEntity.addressCity,
            ),
            telephoneNumber = householdEntity.telephoneNumber,
            email = householdEntity.email,
            validUntil = householdEntity.validUntil,
            locked = householdEntity.locked,
            lockedAt = householdEntity.lockedAt,
            lockedBy = householdEntity.lockedBy?.let { "${it.employee!!.personnelNumber} ${it.employee!!.firstname} ${it.employee!!.lastname}" },
            lockReason = householdEntity.lockReason,
            pendingCostContribution = householdEntity.pendingCostContribution,
            persons = listOfNotNull(mainPersonEntity?.let { mapPerson(it) }) + additionalPersons,
        )
    }

    private fun mapPerson(personEntity: PersonEntity) = Person(
        id = personEntity.id,
        isMainPerson = personEntity.isMainPerson,
        firstname = personEntity.firstname,
        lastname = personEntity.lastname,
        birthDate = personEntity.birthDate,
        gender = mapGender(personEntity.gender),
        country = mapCountryToResponse(personEntity.country!!),
        employer = personEntity.employer,
        income = personEntity.income,
        incomeDue = personEntity.incomeDue,
        receivesFamilyAllowance = personEntity.receivesFamilyAllowance,
        excludeFromHousehold = personEntity.excludeFromHousehold,
    )

    private fun mapGender(gender: Gender?): PersonGender? = gender?.let { PersonGender.valueOf(it.name) }

    private fun mapCountryToResponse(country: CountryEntity): Country = Country(
        id = country.id!!,
        code = country.code!!,
        name = country.name!!,
    )
}

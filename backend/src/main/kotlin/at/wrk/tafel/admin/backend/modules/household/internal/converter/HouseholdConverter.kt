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
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdIssuer
import at.wrk.tafel.admin.backend.modules.household.HouseholdRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.PersonGender
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@Component
class HouseholdConverter(
    private val householdRepository: HouseholdRepository,
    private val personRepository: PersonRepository,
    private val countryRepository: CountryRepository,
    private val userRepository: UserRepository,
) {

    /**
     * Never use this for household-merge re-parenting: `persons.clear(); persons.addAll(...)` below
     * relies on `orphanRemoval = true` to delete anyone not present in `householdUpdate.persons`, so
     * feeding it anything less than the complete target person list would silently delete people.
     * `HouseholdMergeService` re-parents persons via dedicated bulk repository updates instead.
     */
    fun mapHouseholdToEntity(householdUpdate: HouseholdRequest, storedEntity: HouseholdEntity? = null): HouseholdEntity {
        val user = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val userEntity = userRepository.findByUsername(user.username!!)
        val householdId = householdUpdate.id ?: householdRepository.getNextHouseholdSequenceValue()
        val householdEntity = storedEntity ?: HouseholdEntity(
            householdId = householdId,
            validUntil = householdUpdate.validUntil ?: LocalDate.now(),
        )

        householdEntity.householdId = householdId
        householdEntity.issuer = householdEntity.issuer ?: userEntity!!.employee
        householdEntity.addressStreet = householdUpdate.address.street?.trim()
        householdEntity.addressHouseNumber = householdUpdate.address.houseNumber?.trim()
        householdEntity.addressStairway = householdUpdate.address.stairway?.trim()
        householdEntity.addressDoor = householdUpdate.address.door?.trim()
        householdEntity.addressPostalCode = householdUpdate.address.postalCode
        householdEntity.addressCity = householdUpdate.address.city?.trim()
        householdEntity.telephoneNumber = householdUpdate.telephoneNumber
        householdEntity.email = householdUpdate.email?.takeIf { it.isNotBlank() }?.trim()
        householdEntity.singleParent = householdUpdate.singleParent

        // Only stamped when this save actually pushes `validUntil` further out; any other update
        // leaves the stored value untouched. `HouseholdService.getHouseholdsOverview` ("Verlängert")
        // and `DistributionStatisticService`'s `countCustomersProlonged` select on `prolongedAt`
        // falling inside a distribution's window, so clearing it on an unrelated later edit (address,
        // telephone number, an added person) would silently drop the household from that
        // distribution's numbers.
        if (storedEntity != null &&
            householdUpdate.validUntil != null &&
            householdUpdate.validUntil.isAfter(storedEntity.validUntil)
        ) {
            householdEntity.prolongedAt = LocalDateTime.now()
        }
        if (householdUpdate.validUntil != null) {
            householdEntity.validUntil = householdUpdate.validUntil
        }

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

        // The main person row is always updated in place (never removed and re-created), so that
        // households.main_person_id never points at a row scheduled for orphan removal.
        val storedMainPerson = householdEntity.persons.firstOrNull { it.isMainPerson }

        val mappedPersons = householdUpdate.persons.map { person ->
            val existingEntity: PersonEntity? = if (person.isMainPerson) {
                storedMainPerson ?: person.id?.let { personRepository.findByIdOrNull(it) }
            } else {
                person.id?.let { personRepository.findByIdOrNull(it) }
            }
            val personEntity = existingEntity ?: PersonEntity(
                household = householdEntity,
                country = countryRepository.findById(person.country.id).get(),
            )

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

    fun mapEntityToHousehold(householdEntity: HouseholdEntity): HouseholdResponse {
        val mainPersonEntity = householdEntity.mainPerson ?: householdEntity.persons.firstOrNull { it.isMainPerson }
        val additionalPersons = householdEntity.persons
            .filterNot { it.isMainPerson }
            .map { mapPerson(it) }
            .sortedBy { "${it.lastname} ${it.firstname}" }

        return HouseholdResponse(
            id = householdEntity.householdId,
            issuer = householdEntity.issuer?.let {
                HouseholdIssuer(
                    personnelNumber = it.personnelNumber,
                    firstname = it.firstname,
                    lastname = it.lastname,
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
            lockedBy = householdEntity.lockedBy?.let { "${it.employee.personnelNumber} ${it.employee.firstname} ${it.employee.lastname}" },
            lockReason = householdEntity.lockReason,
            pendingCostContribution = householdEntity.pendingCostContribution,
            singleParent = householdEntity.singleParent,
            persons = listOfNotNull(mainPersonEntity?.let { mapPerson(it) }) + additionalPersons,
        )
    }

    /**
     * `internal` (not `private`) so `HouseholdMergeService`/`HouseholdMergePlanner` can build
     * [Person] preview payloads for source-household persons without duplicating this mapping.
     */
    internal fun mapPerson(personEntity: PersonEntity) = Person(
        id = personEntity.id,
        isMainPerson = personEntity.isMainPerson,
        firstname = personEntity.firstname,
        lastname = personEntity.lastname,
        birthDate = personEntity.birthDate,
        gender = mapGender(personEntity.gender),
        country = mapCountryToResponse(personEntity.country),
        employer = personEntity.employer,
        income = personEntity.income,
        incomeDue = personEntity.incomeDue,
        receivesFamilyAllowance = personEntity.receivesFamilyAllowance,
        excludeFromHousehold = personEntity.excludeFromHousehold,
    )

    private fun mapGender(gender: Gender?): PersonGender? = gender?.let { PersonGender.valueOf(it.name) }

    private fun mapCountryToResponse(country: CountryEntity): CountryItem = CountryItem(
        id = country.id!!,
        code = country.code,
        name = country.name,
    )
}

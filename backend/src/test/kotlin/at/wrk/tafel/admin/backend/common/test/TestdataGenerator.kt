package at.wrk.tafel.admin.backend.common.test

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import kotlin.random.Random

object TestdataGenerator {

    fun generateRandomLong(): Long = Random.nextLong(0, 9999999999999)

    fun createUser(): UserEntity {
        val randomNumber = generateRandomLong()

        return UserEntity(
            username = "testuser-$randomNumber",
            password = "dummy",
            employee = EmployeeEntity(
                personnelNumber = randomNumber.toString(),
                firstname = "firstname-$randomNumber",
                lastname = "lastname-$randomNumber",
            ),
            enabled = true,
            passwordChangeRequired = false,
        )
    }

    fun createDistribution(user: UserEntity): DistributionEntity = DistributionEntity(
        startedAt = LocalDateTime.now(),
        startedByUser = user,
    )

    /**
     * Creates a household including its main person - the household's `mainPerson` pointer is
     * deliberately left unset, it can only be written after both rows exist (see HouseholdService).
     */
    fun createHousehold(issuer: EmployeeEntity, country: CountryEntity): HouseholdEntity {
        val randomNumber = generateRandomLong()

        val household = HouseholdEntity(
            householdId = generateRandomLong(),
            validUntil = LocalDate.now().plusYears(1),
            locked = false,
            migrated = false,
        )

        household.issuer = issuer
        household.addressStreet = "street-$randomNumber"
        household.addressHouseNumber = "${Random.nextInt(1, 9999)}A"
        household.addressStairway = "${Random.nextInt(1, 9)}"
        household.addressDoor = "${Random.nextInt(1, 9999)}"
        household.addressPostalCode = Random.nextInt()
        household.addressCity = "city-$randomNumber"
        household.telephoneNumber = "telephoneNumber-$randomNumber"
        household.email = "email-$randomNumber"
        household.prolongedAt = null

        household.lockedAt = null
        household.lockedBy = null
        household.lockReason = null

        val mainPerson = PersonEntity(household = household, country = country, isMainPerson = true)
        mainPerson.lastname = "lastname-$randomNumber"
        mainPerson.firstname = "firstname-$randomNumber"
        mainPerson.birthDate = LocalDate.now().minusYears(30)
        mainPerson.gender = Gender.MALE
        mainPerson.employer = "employer-$randomNumber"
        mainPerson.income = BigDecimal("500")
        mainPerson.incomeDue = LocalDate.now().plusYears(1)
        household.persons.add(mainPerson)

        return household
    }

    fun createCountry(): CountryEntity {
        val randomNumber = generateRandomLong()

        return CountryEntity(code = "00", name = "Country-$randomNumber")
    }
}

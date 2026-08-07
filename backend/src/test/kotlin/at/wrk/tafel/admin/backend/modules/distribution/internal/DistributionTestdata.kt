package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.country.testCountry2
import at.wrk.tafel.admin.backend.modules.base.country.testCountry3
import at.wrk.tafel.admin.backend.modules.base.country.testCountry4
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity1
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity2
import at.wrk.tafel.admin.backend.security.testUserEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

val testDistributionEntity = DistributionEntity(
    startedAt = LocalDateTime.now(),
    startedByUser = testUserEntity,
).apply {
    id = 123
    endedAt = null
}

val testDistributionStatisticEntity = DistributionStatisticEntity(distribution = testDistributionEntity).apply {
    employeeCount = 100
    shelters = listOf(
        testDistributionStatisticShelterEntity1,
        testDistributionStatisticShelterEntity2,
    ).toMutableList()
}.also { testDistributionEntity.statistic = it }

/**
 * Attaches the main person of a household - always the same shape the application produces:
 * a person row flagged as main person, plus the household's `mainPerson` pointer.
 */
private fun HouseholdEntity.withMainPerson(
    personId: Long,
    firstname: String,
    lastname: String,
    birthDate: LocalDate,
    personCountry: CountryEntity,
    personEmployer: String? = null,
    personIncome: BigDecimal? = null,
    personIncomeDue: LocalDate? = null,
): HouseholdEntity {
    val person = PersonEntity(household = this@withMainPerson, country = personCountry, isMainPerson = true).apply {
        id = personId
        createdAt = LocalDateTime.now()
        this.firstname = firstname
        this.lastname = lastname
        this.birthDate = birthDate
        employer = personEmployer
        income = personIncome
        incomeDue = personIncomeDue
    }
    persons.add(person)
    mainPerson = person
    return this
}

private fun HouseholdEntity.withAdditionalPerson(person: PersonEntity): HouseholdEntity {
    person.household = this
    person.isMainPerson = false
    persons.add(person)
    return this
}

private val testHousehold1 = run {
    val household = HouseholdEntity(householdId = 100, validUntil = LocalDate.now(), locked = false).apply {
        id = 1
        issuer = testUserEntity.employee
        createdAt = LocalDateTime.now()
        addressStreet = "Test-Straße"
        addressHouseNumber = "100"
        addressStairway = "1"
        addressPostalCode = 1010
        addressDoor = "21"
        addressCity = "Wien"
        telephoneNumber = "0043660123123"
        email = "test@mail.com"
        pendingCostContribution = BigDecimal("12")
    }
    household.withMainPerson(
        personId = 1,
        firstname = "Max",
        lastname = "Mustermann",
        birthDate = LocalDate.now().minusYears(30),
        personCountry = testCountry1,
        personEmployer = "Employer 123",
        personIncome = BigDecimal("1000"),
        personIncomeDue = LocalDate.now(),
    )
    household.withAdditionalPerson(
        PersonEntity(household = household, country = testCountry2).apply {
            id = 2
            lastname = "Add pers 1"
            firstname = "Add pers 1"
            birthDate = LocalDate.now().minusYears(1)
            income = BigDecimal("100")
            incomeDue = LocalDate.now()
            excludeFromHousehold = false
        },
    )
    household.withAdditionalPerson(
        PersonEntity(household = household, country = testCountry3).apply {
            id = 3
            lastname = "Add pers 2"
            firstname = "Add pers 2"
            birthDate = LocalDate.now().minusYears(21)
            excludeFromHousehold = true
        },
    )
    household
}

val testDistributionHouseholdEntity1 = DistributionHouseholdEntity(
    distribution = testDistributionEntity,
    household = testHousehold1,
    ticketNumber = 50,
    processed = true,
    costContributionPaid = false,
).apply {
    id = 1
    createdAt = LocalDateTime.now()
}

private val testHousehold2 = HouseholdEntity(householdId = 200, validUntil = LocalDate.now(), locked = false).apply {
    id = 2
    createdAt = LocalDateTime.now()
    addressStreet = "Test-Straße 2"
    addressHouseNumber = "200"
    addressStairway = "1-2"
    addressPostalCode = 1010
    addressDoor = "21-2"
    addressCity = "Wien 2"
    telephoneNumber = "0043660123123"
    email = "test2@mail.com"
    pendingCostContribution = BigDecimal.ZERO
}.withMainPerson(
    personId = 2,
    firstname = "Max 2",
    lastname = "Mustermann",
    birthDate = LocalDate.now().minusYears(55),
    personCountry = testCountry4,
    personEmployer = "Employer 123-2",
    personIncome = BigDecimal("2000"),
    personIncomeDue = LocalDate.now(),
)

val testDistributionHouseholdEntity2 = DistributionHouseholdEntity(
    distribution = testDistributionEntity,
    household = testHousehold2,
    ticketNumber = 51,
    processed = false,
    costContributionPaid = false,
).apply {
    id = 2
    createdAt = LocalDateTime.now()
}

private val testHousehold3 = HouseholdEntity(householdId = 300, validUntil = LocalDate.now(), locked = false).apply {
    id = 3
    createdAt = LocalDateTime.now()
    addressStreet = "Test-Straße 3"
    addressHouseNumber = "300"
    addressStairway = "1-3"
    addressPostalCode = 1010
    addressDoor = "21-3"
    addressCity = "Wien 3"
    telephoneNumber = "0043660123123"
    email = "test3@mail.com"
}.withMainPerson(
    personId = 3,
    firstname = "Max 3",
    lastname = "Mustermann",
    birthDate = LocalDate.now().minusYears(85),
    personCountry = testCountry1,
    personEmployer = "Employer 123-3",
    personIncome = BigDecimal("3000"),
    personIncomeDue = LocalDate.now(),
)

val testDistributionHouseholdEntity3 = DistributionHouseholdEntity(
    distribution = testDistributionEntity,
    household = testHousehold3,
    ticketNumber = 52,
    processed = false,
    costContributionPaid = true,
).apply {
    id = 3
    createdAt = LocalDateTime.now()
}

private val testHousehold4 = run {
    val household = HouseholdEntity(householdId = 400, validUntil = LocalDate.now(), locked = false).apply {
        id = 4
        createdAt = LocalDateTime.now()
        addressStreet = "Test-Straße 4"
        addressHouseNumber = "400"
        addressStairway = "1-4"
        addressPostalCode = 1010
        addressDoor = "21-4"
        addressCity = "Wien 4"
        telephoneNumber = "0043660123123"
        email = "test4@mail.com"
    }
    household.withMainPerson(
        personId = 4,
        firstname = "Max 4",
        lastname = "Mustermann",
        birthDate = LocalDate.now().minusYears(85),
        personCountry = testCountry2,
        personEmployer = "Employer 123-4",
        personIncome = BigDecimal("4000"),
        personIncomeDue = LocalDate.now(),
    )
    household.withAdditionalPerson(
        PersonEntity(household = household, country = testCountry3).apply {
            id = 401
            lastname = "Add pers 1"
            firstname = "Add pers 1"
            birthDate = LocalDate.now().minusYears(75)
            income = BigDecimal("100")
            incomeDue = LocalDate.now()
            excludeFromHousehold = false
        },
    )
    household.withAdditionalPerson(
        PersonEntity(household = household, country = testCountry1).apply {
            id = 402
            lastname = "Add pers 2"
            firstname = "Add pers 2"
            birthDate = LocalDate.now().minusYears(65)
            excludeFromHousehold = true
        },
    )
    household.withAdditionalPerson(
        PersonEntity(household = household, country = testCountry1).apply {
            id = 403
            lastname = "Add pers 3"
            firstname = "Add pers 3"
            birthDate = LocalDate.now().minusYears(35)
            excludeFromHousehold = true
        },
    )
    household
}

val testDistributionHouseholdEntity4 = DistributionHouseholdEntity(
    distribution = testDistributionEntity,
    household = testHousehold4,
    ticketNumber = 52,
    processed = false,
    costContributionPaid = true,
).apply {
    id = 4
    createdAt = LocalDateTime.now()
}

package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
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

val testDistributionStatisticEntity = DistributionStatisticEntity().apply {
    employeeCount = 100
    shelters = listOf(
        testDistributionStatisticShelterEntity1,
        testDistributionStatisticShelterEntity2
    ).toMutableList()
}

val testDistributionEntity = DistributionEntity().apply {
    id = 123
    startedAt = LocalDateTime.now()
    statistic = testDistributionStatisticEntity
}

val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
    id = 1
    createdAt = LocalDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 1
        issuer = testUserEntity.employee
        createdAt = LocalDateTime.now()
        customerId = 100
        lastname = "Mustermann"
        firstname = "Max"
        birthDate = LocalDate.now().minusYears(30)
        country = testCountry1
        addressStreet = "Test-Straße"
        addressHouseNumber = "100"
        addressStairway = "1"
        addressPostalCode = 1010
        addressDoor = "21"
        addressCity = "Wien"
        telephoneNumber = "0043660123123"
        email = "test@mail.com"
        employer = "Employer 123"
        income = BigDecimal("1000")
        incomeDue = LocalDate.now()
        validUntil = LocalDate.now()
        locked = false
        pendingCostContribution = BigDecimal("12")

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 2
        addPerson1.lastname = "Add pers 1"
        addPerson1.firstname = "Add pers 1"
        addPerson1.birthDate = LocalDate.now().minusYears(1)
        addPerson1.income = BigDecimal("100")
        addPerson1.incomeDue = LocalDate.now()
        addPerson1.country = testCountry2
        addPerson1.excludeFromHousehold = false

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 3
        addPerson2.lastname = "Add pers 2"
        addPerson2.firstname = "Add pers 2"
        addPerson2.birthDate = LocalDate.now().minusYears(21)
        addPerson2.country = testCountry3
        addPerson2.excludeFromHousehold = true

        additionalPersons = mutableListOf(addPerson1, addPerson2)
    }
    ticketNumber = 50
    processed = true
    costContributionPaid = false
}

val testDistributionCustomerEntity2 = DistributionCustomerEntity().apply {
    id = 2
    createdAt = LocalDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 2
        createdAt = LocalDateTime.now()
        customerId = 200
        lastname = "Mustermann"
        firstname = "Max 2"
        birthDate = LocalDate.now().minusYears(55)
        country = testCountry4
        addressStreet = "Test-Straße 2"
        addressHouseNumber = "200"
        addressStairway = "1-2"
        addressPostalCode = 1010
        addressDoor = "21-2"
        addressCity = "Wien 2"
        telephoneNumber = "0043660123123"
        email = "test2@mail.com"
        employer = "Employer 123-2"
        income = BigDecimal("2000")
        incomeDue = LocalDate.now()
        validUntil = LocalDate.now()
        locked = false
        pendingCostContribution = BigDecimal.ZERO
    }
    ticketNumber = 51
    processed = false
    costContributionPaid = false
}

val testDistributionCustomerEntity3 = DistributionCustomerEntity().apply {
    id = 3
    createdAt = LocalDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 3
        createdAt = LocalDateTime.now()
        customerId = 300
        lastname = "Mustermann"
        firstname = "Max 3"
        birthDate = LocalDate.now().minusYears(85)
        country = testCountry1
        addressStreet = "Test-Straße 3"
        addressHouseNumber = "300"
        addressStairway = "1-3"
        addressPostalCode = 1010
        addressDoor = "21-3"
        addressCity = "Wien 3"
        telephoneNumber = "0043660123123"
        email = "test3@mail.com"
        employer = "Employer 123-3"
        income = BigDecimal("3000")
        incomeDue = LocalDate.now()
        validUntil = LocalDate.now()
        locked = false
    }
    ticketNumber = 52
    processed = false
    costContributionPaid = true
}

val testDistributionCustomerEntity4 = DistributionCustomerEntity().apply {
    id = 4
    createdAt = LocalDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 4
        createdAt = LocalDateTime.now()
        customerId = 400
        lastname = "Mustermann"
        firstname = "Max 4"
        birthDate = LocalDate.now().minusYears(85)
        country = testCountry2
        addressStreet = "Test-Straße 4"
        addressHouseNumber = "400"
        addressStairway = "1-4"
        addressPostalCode = 1010
        addressDoor = "21-4"
        addressCity = "Wien 4"
        telephoneNumber = "0043660123123"
        email = "test4@mail.com"
        employer = "Employer 123-4"
        income = BigDecimal("4000")
        incomeDue = LocalDate.now()
        validUntil = LocalDate.now()
        locked = false

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 401
        addPerson1.lastname = "Add pers 1"
        addPerson1.firstname = "Add pers 1"
        addPerson1.birthDate = LocalDate.now().minusYears(75)
        addPerson1.income = BigDecimal("100")
        addPerson1.incomeDue = LocalDate.now()
        addPerson1.country = testCountry3
        addPerson1.excludeFromHousehold = false

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 402
        addPerson2.lastname = "Add pers 2"
        addPerson2.firstname = "Add pers 2"
        addPerson2.birthDate = LocalDate.now().minusYears(65)
        addPerson2.country = testCountry1
        addPerson2.excludeFromHousehold = true

        val addPerson3 = CustomerAddPersonEntity()
        addPerson3.id = 403
        addPerson3.lastname = "Add pers 3"
        addPerson3.firstname = "Add pers 3"
        addPerson3.birthDate = LocalDate.now().minusYears(35)
        addPerson3.country = testCountry1
        addPerson3.excludeFromHousehold = true

        additionalPersons = mutableListOf(addPerson1, addPerson2, addPerson3)
    }
    ticketNumber = 52
    processed = false
    costContributionPaid = true
}

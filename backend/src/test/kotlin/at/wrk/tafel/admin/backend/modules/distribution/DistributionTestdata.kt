package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.testCountry
import at.wrk.tafel.admin.backend.security.testUserEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZonedDateTime

val testDistributionEntity = DistributionEntity().apply {
    id = 123
    state = DistributionState.DISTRIBUTION
}

val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
    id = 1
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 1
        issuer = testUserEntity
        createdAt = ZonedDateTime.now()
        customerId = 100
        lastname = "Mustermann"
        firstname = "Max"
        birthDate = LocalDate.now().minusYears(30)
        country = testCountry
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

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 2
        addPerson1.lastname = "Add pers 1"
        addPerson1.firstname = "Add pers 1"
        addPerson1.birthDate = LocalDate.now().minusYears(1)
        addPerson1.income = BigDecimal("100")
        addPerson1.incomeDue = LocalDate.now()
        addPerson1.country = testCountry
        addPerson1.excludeFromHousehold = false

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 3
        addPerson2.lastname = "Add pers 2"
        addPerson2.firstname = "Add pers 2"
        addPerson2.birthDate = LocalDate.now().minusYears(2)
        addPerson2.country = testCountry
        addPerson2.excludeFromHousehold = true

        additionalPersons = mutableListOf(addPerson1, addPerson2)
    }
    ticketNumber = 50
    processed = false
}

val testDistributionCustomerEntity2 = DistributionCustomerEntity().apply {
    id = 2
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 2
        createdAt = ZonedDateTime.now()
        customerId = 200
        lastname = "Mustermann"
        firstname = "Max 2"
        birthDate = LocalDate.now().minusYears(22)
        country = testCountry
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
    }
    ticketNumber = 51
    processed = false
}

val testDistributionCustomerEntity3 = DistributionCustomerEntity().apply {
    id = 3
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = CustomerEntity().apply {
        id = 3
        createdAt = ZonedDateTime.now()
        customerId = 300
        lastname = "Mustermann"
        firstname = "Max 3"
        birthDate = LocalDate.now().minusYears(22)
        country = testCountry
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
}

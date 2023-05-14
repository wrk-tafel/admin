package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.modules.base.Country
import at.wrk.tafel.admin.backend.security.testUserEntity
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZonedDateTime

val testCustomer = Customer(
    id = 100,
    issuer = CustomerIssuer(
        personnelNumber = "test-personnelnumber",
        firstname = "test-firstname",
        lastname = "test-lastname"
    ),
    issuedAt = LocalDate.now(),
    firstname = "Max",
    lastname = "Mustermann",
    birthDate = LocalDate.now().minusYears(30),
    country = Country(
        id = 1,
        code = "AT",
        name = "Österreich"
    ),
    telephoneNumber = "0043660123123",
    email = "test@mail.com",
    address = CustomerAddress(
        street = "Test-Straße",
        houseNumber = "100",
        stairway = "1",
        door = "21",
        postalCode = 1010,
        city = "Wien"
    ),
    employer = "Employer 123",
    income = BigDecimal("1000"),
    incomeDue = LocalDate.now(),
    validUntil = LocalDate.now(),
    additionalPersons = listOf(
        CustomerAdditionalPerson(
            id = 2,
            firstname = "Add pers 1",
            lastname = "Add pers 1",
            birthDate = LocalDate.now().minusYears(5),
            income = BigDecimal("100"),
            incomeDue = LocalDate.now(),
            country = Country(
                id = 1,
                code = "AT",
                name = "Österreich"
            )
        ),
        CustomerAdditionalPerson(
            id = 3,
            firstname = "Add pers 2",
            lastname = "Add pers 2",
            birthDate = LocalDate.now().minusYears(2),
            country = Country(
                id = 1,
                code = "AT",
                name = "Österreich"
            )
        )
    )
)

val testCountry = CountryEntity().apply {
    id = 1
    code = "AT"
    name = "Österreich"
}

val testCustomerEntity1 = CustomerEntity().apply {
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

    val addPerson1 = CustomerAddPersonEntity()
    addPerson1.id = 2
    addPerson1.lastname = "Add pers 1"
    addPerson1.firstname = "Add pers 1"
    addPerson1.birthDate = LocalDate.now().minusYears(5)
    addPerson1.income = BigDecimal("100")
    addPerson1.incomeDue = LocalDate.now()
    addPerson1.country = testCountry

    val addPerson2 = CustomerAddPersonEntity()
    addPerson2.id = 3
    addPerson2.lastname = "Add pers 2"
    addPerson2.firstname = "Add pers 2"
    addPerson2.birthDate = LocalDate.now().minusYears(2)
    addPerson2.country = testCountry

    additionalPersons = mutableListOf(addPerson1, addPerson2)
}

val testCustomerEntity2 = CustomerEntity().apply {
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
}

val testCustomerEntity3 = CustomerEntity().apply {
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
}

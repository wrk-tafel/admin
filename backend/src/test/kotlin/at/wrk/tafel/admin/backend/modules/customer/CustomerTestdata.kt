package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.modules.base.Country
import java.math.BigDecimal
import java.time.LocalDate

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
            incomeDue = LocalDate.now()
        ),
        CustomerAdditionalPerson(
            id = 3,
            firstname = "Add pers 2",
            lastname = "Add pers 2",
            birthDate = LocalDate.now().minusYears(2)
        )
    )
)

package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import at.wrk.tafel.admin.backend.database.repositories.CustomerRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class CustomerControllerTest {
    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @InjectMockKs
    private lateinit var customerController: CustomerController

    @Test
    fun `list customers`() {
        val customer = CustomerEntity()
        customer.id = 1
        customer.lastname = "Mustermann"
        customer.firstname = "Max"
        customer.birthDate = LocalDate.now()
        customer.addressStreet = "Test-Straße"
        customer.addressHouseNumber = "100"
        customer.addressStairway = "1"
        customer.addressPostalCode = 1010
        customer.addressDoor = "21"
        customer.addressCity = "Wien"
        customer.telephoneNumber = 43660123123
        customer.email = "test@mail.com"
        customer.employer = "Employer 123"
        customer.income = BigDecimal("1000")
        customer.incomeDue = LocalDate.now()
        customer.countPersonsInHousehold = 4
        customer.countInfants = 1

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 2
        addPerson1.lastname = "Add lastname 1"
        addPerson1.firstname = "Add firstname 1"
        addPerson1.birthDate = LocalDate.now()
        addPerson1.income = BigDecimal("100")

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 3
        addPerson2.lastname = "Add lastname 2"
        addPerson2.firstname = "Add firstname 2"
        addPerson2.birthDate = LocalDate.now()
        addPerson2.income = BigDecimal("200")

        customer.additionalPersons = setOf(addPerson1, addPerson2)

        every { customerRepository.findAll() } returns listOf(customer)

        val response = customerController.listCustomers()

        Assertions.assertThat(response).isNotNull
        Assertions.assertThat(response.items).hasSize(1)

        Assertions.assertThat(response.items).hasSameElementsAs(
            listOf(
                Customer(
                    id = 1,
                    lastname = "Mustermann",
                    firstname = "Max",
                    birthDate = LocalDate.now(),
                    address = CustomerAddress(
                        street = "Test-Straße",
                        houseNumber = "100",
                        stairway = "1",
                        door = "21",
                        postalCode = 1010,
                        city = "Wien"
                    ),
                    telephoneNumber = 43660123123,
                    email = "test@mail.com",
                    employer = "Employer 123",
                    income = BigDecimal("1000"),
                    incomeDue = LocalDate.now(),
                    additionalPersons = listOf(
                        CustomerAdditionalPerson(
                            id = 2,
                            lastname = "Add lastname 1",
                            firstname = "Add firstname 1",
                            birthDate = LocalDate.now(),
                            income = BigDecimal("100")
                        ),
                        CustomerAdditionalPerson(
                            id = 3,
                            lastname = "Add lastname 2",
                            firstname = "Add firstname 2",
                            birthDate = LocalDate.now(),
                            income = BigDecimal("200")
                        )
                    )
                )
            )
        )
    }
}

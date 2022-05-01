package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import io.mockk.every
import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.fail
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

@ExtendWith(MockKExtension::class)
class MasterdataPdfServiceImplTest {

    private lateinit var masterdataPdfServiceImpl: MasterdataPdfServiceImpl

    private val testCustomerEntity = CustomerEntity()

    @BeforeEach
    fun beforeEach() {
        testCustomerEntity.id = 1
        testCustomerEntity.customerId = 100
        testCustomerEntity.lastname = "Mustermann"
        testCustomerEntity.firstname = "Max"
        testCustomerEntity.birthDate = LocalDate.of(10, 3, 1980)
        testCustomerEntity.addressStreet = "Test-Straße"
        testCustomerEntity.addressHouseNumber = "100"
        testCustomerEntity.addressStairway = "1"
        testCustomerEntity.addressPostalCode = 1010
        testCustomerEntity.addressDoor = "21"
        testCustomerEntity.addressCity = "Wien"
        testCustomerEntity.telephoneNumber = 43660123123
        testCustomerEntity.email = "test@mail.com"
        testCustomerEntity.employer = "Employer 123"

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 2
        addPerson1.lastname = "Add pers 1"
        addPerson1.firstname = "Child"
        addPerson1.birthDate = LocalDate.now().minusYears(5)
        addPerson1.income = BigDecimal("100")

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 3
        addPerson2.lastname = "Add pers 2"
        addPerson2.firstname = "Child < 3"
        addPerson2.birthDate = LocalDate.now().minusYears(2)
        addPerson2.income = BigDecimal("200")

        testCustomerEntity.additionalPersons = listOf(addPerson1, addPerson2)

        masterdataPdfServiceImpl = MasterdataPdfServiceImpl()
    }

    @Test
    fun test() {
        fail("IMPL")
    }

}

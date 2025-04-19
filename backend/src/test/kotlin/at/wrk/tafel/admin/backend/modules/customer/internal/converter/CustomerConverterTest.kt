package at.wrk.tafel.admin.backend.modules.customer.internal.converter

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerAddPersonRepository
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.Country
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.customer.Customer
import at.wrk.tafel.admin.backend.modules.customer.CustomerAdditionalPerson
import at.wrk.tafel.admin.backend.modules.customer.CustomerAddress
import at.wrk.tafel.admin.backend.modules.customer.CustomerGender
import at.wrk.tafel.admin.backend.modules.customer.CustomerIssuer
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.*

@ExtendWith(MockKExtension::class)
internal class CustomerConverterTest {

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @RelaxedMockK
    private lateinit var customerAddPersonRepository: CustomerAddPersonRepository

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var converter: CustomerConverter

    private val testCustomer = Customer(
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
        gender = CustomerGender.FEMALE,
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
        locked = false,
        pendingCostContribution = null,
        additionalPersons = listOf(
            CustomerAdditionalPerson(
                id = 2,
                firstname = "Add pers 1",
                lastname = "Add pers 1",
                birthDate = LocalDate.now().minusYears(5),
                gender = CustomerGender.MALE,
                income = BigDecimal("100"),
                incomeDue = LocalDate.now(),
                receivesFamilyBonus = false,
                country = Country(
                    id = 1,
                    code = "AT",
                    name = "Österreich"
                ),
                excludeFromHousehold = false
            ),
            CustomerAdditionalPerson(
                id = 3,
                firstname = "Add pers 2",
                lastname = "Add pers 2",
                birthDate = LocalDate.now().minusYears(2),
                gender = CustomerGender.FEMALE,
                receivesFamilyBonus = true,
                country = Country(
                    id = 1,
                    code = "AT",
                    name = "Österreich"
                ),
                excludeFromHousehold = true
            )
        )
    )

    private val testCustomerEntity1 = CustomerEntity().apply {
        createdAt = LocalDateTime.now()
        issuer = testUserEntity.employee
        customerId = 100
        lastname = "Mustermann"
        firstname = "Max"
        birthDate = LocalDate.now().minusYears(30)
        gender = Gender.FEMALE
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
        prolongedAt = null
        pendingCostContribution = BigDecimal.TEN

        val addPerson1 = CustomerAddPersonEntity()
        addPerson1.id = 2
        addPerson1.lastname = "Add pers 1"
        addPerson1.firstname = "Add pers 1"
        addPerson1.birthDate = LocalDate.now().minusYears(5)
        addPerson1.gender = Gender.MALE
        addPerson1.income = BigDecimal("100")
        addPerson1.incomeDue = LocalDate.now()
        addPerson1.receivesFamilyBonus = false
        addPerson1.country = testCountry1
        addPerson1.excludeFromHousehold = false

        val addPerson2 = CustomerAddPersonEntity()
        addPerson2.id = 3
        addPerson2.lastname = "Add pers 2"
        addPerson2.firstname = "Add pers 2"
        addPerson2.birthDate = LocalDate.now().minusYears(2)
        addPerson2.gender = Gender.FEMALE
        addPerson2.country = testCountry1
        addPerson2.receivesFamilyBonus = true
        addPerson2.excludeFromHousehold = true

        additionalPersons = mutableListOf(addPerson1, addPerson2)
    }

    private val testCustomerEntity2 = CustomerEntity().apply {
        id = 2
        createdAt = LocalDateTime.now()
        customerId = 200
        lastname = "Mustermann"
        firstname = "Max 2"
        birthDate = LocalDate.now().minusYears(22)
        country = testCountry1
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
        locked = true
        lockReason = "dummy reason"
        lockedBy = testUserEntity
        pendingCostContribution = BigDecimal.ZERO
    }

    @BeforeEach
    fun beforeEach() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) }
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        every { userRepository.findByUsername(testUser.username) } returns testUserEntity
        every { countryRepository.findById(testCustomer.country.id) } returns Optional.of(testCountry1)

        every { customerAddPersonRepository.findById(testCustomer.additionalPersons[0].id) } returns Optional.of(
            testCustomerEntity1.additionalPersons[0]
        )
        every { customerAddPersonRepository.findById(testCustomer.additionalPersons[1].id) } returns Optional.of(
            testCustomerEntity1.additionalPersons[1]
        )
    }

    @Test
    fun `map entity to customer`() {
        val customer = converter.mapEntityToCustomer(testCustomerEntity1)

        assertThat(customer.id).isEqualTo(testCustomerEntity1.customerId)
        assertThat(customer.issuer).isEqualTo(
            CustomerIssuer(
                personnelNumber = testUser.personnelNumber,
                firstname = testUser.firstname,
                lastname = testUser.lastname
            )
        )
        assertThat(customer.lastname).isEqualTo(testCustomer.lastname)
        assertThat(customer.firstname).isEqualTo(testCustomer.firstname)
        assertThat(customer.birthDate).isEqualTo(testCustomer.birthDate)
        assertThat(customer.gender!!.name).isEqualTo(testCustomer.gender!!.name)
        assertThat(customer.country).isEqualTo(
            Country(
                id = testCountry1.id!!,
                code = testCountry1.code!!,
                name = testCountry1.name!!
            )
        )
        assertThat(customer.address.street).isEqualTo(testCustomer.address.street)
        assertThat(customer.address.houseNumber).isEqualTo(testCustomer.address.houseNumber)
        assertThat(customer.address.stairway).isEqualTo(testCustomer.address.stairway)
        assertThat(customer.address.door).isEqualTo(testCustomer.address.door)
        assertThat(customer.address.postalCode).isEqualTo(testCustomer.address.postalCode)
        assertThat(customer.address.city).isEqualTo(testCustomer.address.city)
        assertThat(customer.telephoneNumber).isEqualTo(testCustomer.telephoneNumber)
        assertThat(customer.email).isEqualTo(testCustomer.email)
        assertThat(customer.employer).isEqualTo(testCustomer.employer)
        assertThat(customer.income).isEqualTo(testCustomer.income)
        assertThat(customer.incomeDue).isEqualTo(testCustomer.incomeDue)
        assertThat(customer.validUntil).isEqualTo(testCustomer.validUntil)
        assertThat(customer.pendingCostContribution).isEqualTo(BigDecimal.TEN)

        assertThat(customer.locked).isFalse()
        assertThat(customer.lockedAt).isNull()
        assertThat(customer.lockedBy).isNull()
        assertThat(customer.lockReason).isNull()
    }

    @Test
    fun `map to new entity`() {
        val result = converter.mapCustomerToEntity(testCustomer)

        assertThat(result).isEqualTo(testCustomerEntity1)
    }

    @Test
    fun `map to existing entity`() {
        val updatedCustomerEntity = CustomerEntity().apply {
            issuer = testUserEntity.employee
            customerId = 100
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            gender = Gender.FEMALE
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

            val addPerson1 = CustomerAddPersonEntity()
            addPerson1.id = 2
            addPerson1.lastname = "Add pers 1"
            addPerson1.firstname = "Add pers 1"
            addPerson1.birthDate = LocalDate.now().minusYears(5)
            addPerson1.gender = Gender.MALE
            addPerson1.income = BigDecimal("100")
            addPerson1.incomeDue = LocalDate.now()
            addPerson1.receivesFamilyBonus = false
            addPerson1.country = testCountry1
            addPerson1.excludeFromHousehold = false

            val addPerson2 = CustomerAddPersonEntity()
            addPerson2.id = 3
            addPerson2.lastname = "Add pers 2"
            addPerson2.firstname = "Add pers 2"
            addPerson2.birthDate = LocalDate.now().minusYears(2)
            addPerson2.gender = Gender.FEMALE
            addPerson2.country = testCountry1
            addPerson2.receivesFamilyBonus = true
            addPerson2.excludeFromHousehold = true

            additionalPersons = mutableListOf(addPerson1, addPerson2)
        }

        val updatedCustomer = testCustomer.copy(
            lastname = "updated-lastname",
            firstname = "updated-firstname",
            birthDate = LocalDate.now(),
            gender = CustomerGender.MALE,
            employer = "updated-employer",
            income = BigDecimal.TEN,
            validUntil = LocalDate.now().plusYears(1),
            pendingCostContribution = BigDecimal.TEN,
            additionalPersons = listOf(
                testCustomer.additionalPersons[0].copy(
                    gender = CustomerGender.FEMALE,
                    excludeFromHousehold = true
                )
            )
        )

        val result = converter.mapCustomerToEntity(updatedCustomer, testCustomerEntity1)

        assertThat(result).isEqualTo(updatedCustomerEntity)
    }

    @Test
    fun `update customer and prolongedAt is filled`() {
        val validUntil = LocalDate.now().plusYears(1)
        val updatedCustomer = testCustomer.copy(
            validUntil = validUntil
        )

        val result = converter.mapCustomerToEntity(updatedCustomer, testCustomerEntity1)

        assertThat(result.prolongedAt).isNotNull()
    }

    @Test
    fun `update customer and lock`() {
        val updatedCustomer = testCustomer.copy(
            locked = true,
            lockReason = "locked due to lorem ipsum",
            additionalPersons = emptyList()
        )

        val result = converter.mapCustomerToEntity(updatedCustomer, testCustomerEntity1)

        assertThat(result.locked).isTrue()
        assertThat(result.lockedAt).isNotNull()
        assertThat(result.lockReason).isEqualTo(updatedCustomer.lockReason)
        assertThat(result.lockedBy).isEqualTo(testUserEntity)
    }

    @Test
    fun `update customer and unlock`() {
        val updatedCustomer = testCustomer.copy(
            locked = false,
            lockReason = null
        )

        val result = converter.mapCustomerToEntity(updatedCustomer, testCustomerEntity2)

        assertThat(result.locked).isFalse()
        assertThat(result.lockedAt).isNull()
        assertThat(result.lockReason).isNull()
        assertThat(result.lockedBy).isNull()
    }

    @Test
    fun `create customer with income zero is set to null`() {
        val customer = testCustomer.copy(
            income = BigDecimal.ZERO,
            additionalPersons = listOf(
                testCustomer.additionalPersons[0].copy(income = BigDecimal.ZERO),
                testCustomer.additionalPersons[1]
            )
        )

        val result = converter.mapCustomerToEntity(customer)

        assertThat(result.income).isNull()
        assertThat(result.additionalPersons[0].income).isNull()
    }

}

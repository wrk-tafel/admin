package at.wrk.tafel.admin.backend.modules.household.internal.converter

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdIssuer
import at.wrk.tafel.admin.backend.modules.household.HouseholdRequest
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.PersonGender
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
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
internal class HouseholdConverterTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var converter: HouseholdConverter

    private val testCountry = CountryItem(
        id = 1,
        code = "AT",
        name = "Österreich",
    )

    private val testMainPerson = Person(
        id = 1,
        isMainPerson = true,
        firstname = "Max",
        lastname = "Mustermann",
        birthDate = LocalDate.now().minusYears(30),
        gender = PersonGender.FEMALE,
        country = testCountry,
        employer = "Employer 123",
        income = BigDecimal("1000"),
        incomeDue = LocalDate.now(),
    )

    private val testHousehold = HouseholdRequest(
        id = 100,
        issuer = HouseholdIssuer(
            personnelNumber = "test-personnelnumber",
            firstname = "test-firstname",
            lastname = "test-lastname",
        ),
        issuedAt = LocalDate.now(),
        telephoneNumber = "0043660123123",
        email = "test@mail.com",
        address = HouseholdAddress(
            street = "Test-Straße",
            houseNumber = "100",
            stairway = "1",
            door = "21",
            postalCode = 1010,
            city = "Wien",
        ),
        validUntil = LocalDate.now(),
        locked = false,
        pendingCostContribution = null,
        singleParent = true,
        persons = listOf(
            testMainPerson,
            Person(
                id = 2,
                isMainPerson = false,
                firstname = "Add pers 1",
                lastname = "Add pers 1",
                birthDate = LocalDate.now().minusYears(5),
                gender = PersonGender.MALE,
                income = BigDecimal("100"),
                incomeDue = LocalDate.now(),
                receivesFamilyAllowance = false,
                country = testCountry,
                excludeFromHousehold = false,
            ),
            Person(
                id = 3,
                isMainPerson = false,
                firstname = "Add pers 2",
                lastname = "Add pers 2",
                birthDate = LocalDate.now().minusYears(2),
                gender = PersonGender.FEMALE,
                receivesFamilyAllowance = true,
                country = testCountry,
                excludeFromHousehold = true,
            ),
        ),
    )

    /**
     * Person ids are only ever resolved against a stored household's own persons (see
     * [HouseholdConverter.mapHouseholdToEntity]), so a create request - which has no stored household
     * to resolve against - never carries one, same as the real frontend request
     * (`customer-api.service.ts`'s `mapCustomerToHousehold`).
     */
    private val testHouseholdForCreate = testHousehold.copy(persons = testHousehold.persons.map { it.copy(id = null) })

    private val testHouseholdEntity1 = run {
        val household = HouseholdEntity(householdId = 100, validUntil = LocalDate.now(), locked = false).apply {
            createdAt = LocalDateTime.now()
            issuer = testUserEntity.employee
            addressStreet = "Test-Straße"
            addressHouseNumber = "100"
            addressStairway = "1"
            addressPostalCode = 1010
            addressDoor = "21"
            addressCity = "Wien"
            telephoneNumber = "0043660123123"
            email = "test@mail.com"
            prolongedAt = null
            pendingCostContribution = BigDecimal.TEN
            singleParent = true
        }

        val mainPersonEntity = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = 1
            lastname = "Mustermann"
            firstname = "Max"
            birthDate = LocalDate.now().minusYears(30)
            gender = Gender.FEMALE
            employer = "Employer 123"
            income = BigDecimal("1000")
            incomeDue = LocalDate.now()
        }

        val addPerson1 = PersonEntity(household = household, country = testCountry1).apply {
            id = 2
            lastname = "Add pers 1"
            firstname = "Add pers 1"
            birthDate = LocalDate.now().minusYears(5)
            gender = Gender.MALE
            income = BigDecimal("100")
            incomeDue = LocalDate.now()
            receivesFamilyAllowance = false
            excludeFromHousehold = false
        }

        val addPerson2 = PersonEntity(household = household, country = testCountry1).apply {
            id = 3
            lastname = "Add pers 2"
            firstname = "Add pers 2"
            birthDate = LocalDate.now().minusYears(2)
            gender = Gender.FEMALE
            receivesFamilyAllowance = true
            excludeFromHousehold = true
        }

        household.persons = mutableListOf(mainPersonEntity, addPerson1, addPerson2)
        household.mainPerson = mainPersonEntity
        household
    }

    private val testHouseholdEntity2 = run {
        val household = HouseholdEntity(householdId = 200, validUntil = LocalDate.now(), locked = true).apply {
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
            lockReason = "dummy reason"
            lockedBy = testUserEntity
            pendingCostContribution = BigDecimal.ZERO
        }

        val mainPersonEntity = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            id = 20
            lastname = "Mustermann"
            firstname = "Max 2"
            birthDate = LocalDate.now().minusYears(22)
            employer = "Employer 123-2"
            income = BigDecimal("2000")
            incomeDue = LocalDate.now()
        }

        household.persons = mutableListOf(mainPersonEntity)
        household.mainPerson = mainPersonEntity
        household
    }

    @BeforeEach
    fun beforeEach() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        every { userRepository.findByUsername(testUser.username) } returns testUserEntity
        every { countryRepository.findById(testCountry.id) } returns Optional.of(testCountry1)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `map entity to household`() {
        val household = converter.mapEntityToHousehold(testHouseholdEntity1)

        assertThat(household.id).isEqualTo(testHouseholdEntity1.householdId)
        assertThat(household.issuer).isEqualTo(
            HouseholdIssuer(
                personnelNumber = testUser.personnelNumber,
                firstname = testUser.firstname,
                lastname = testUser.lastname,
            ),
        )
        assertThat(household.address.street).isEqualTo(testHousehold.address.street)
        assertThat(household.address.houseNumber).isEqualTo(testHousehold.address.houseNumber)
        assertThat(household.address.stairway).isEqualTo(testHousehold.address.stairway)
        assertThat(household.address.door).isEqualTo(testHousehold.address.door)
        assertThat(household.address.postalCode).isEqualTo(testHousehold.address.postalCode)
        assertThat(household.address.city).isEqualTo(testHousehold.address.city)
        assertThat(household.telephoneNumber).isEqualTo(testHousehold.telephoneNumber)
        assertThat(household.email).isEqualTo(testHousehold.email)
        assertThat(household.validUntil).isEqualTo(testHousehold.validUntil)
        assertThat(household.pendingCostContribution).isEqualTo(BigDecimal.TEN)
        assertThat(household.singleParent).isTrue()

        assertThat(household.locked).isFalse()
        assertThat(household.lockedAt).isNull()
        assertThat(household.lockedBy).isNull()
        assertThat(household.lockReason).isNull()

        // the main person is always first, additional persons follow sorted by name
        assertThat(household.persons).hasSize(3)
        val mainPerson = household.persons.first()
        assertThat(mainPerson.isMainPerson).isTrue()
        assertThat(mainPerson.firstname).isEqualTo("Max")
        assertThat(mainPerson.lastname).isEqualTo("Mustermann")
        assertThat(mainPerson.gender!!.name).isEqualTo(PersonGender.FEMALE.name)
        assertThat(mainPerson.employer).isEqualTo("Employer 123")
        assertThat(mainPerson.income).isEqualTo(BigDecimal("1000"))
        assertThat(mainPerson.country).isEqualTo(
            CountryItem(
                id = testCountry1.id!!,
                code = testCountry1.code!!,
                name = testCountry1.name!!,
            ),
        )

        assertThat(household.mainPerson()).isEqualTo(mainPerson)
        assertThat(household.additionalPersons().map { it.firstname })
            .containsExactly("Add pers 1", "Add pers 2")
        assertThat(household.additionalPersons().none { it.isMainPerson }).isTrue()

        // not asked for, so left unset rather than defaulting to a misleading false
        assertThat(household.hasPrivacyNotice).isNull()
    }

    @Test
    fun `map entity to household passes hasPrivacyNotice through when given`() {
        val household = converter.mapEntityToHousehold(testHouseholdEntity1, hasPrivacyNotice = true)

        assertThat(household.hasPrivacyNotice).isTrue()
    }

    @Test
    fun `map to new entity`() {
        val result = converter.mapHouseholdToEntity(testHouseholdForCreate)

        assertThat(result.householdId).isEqualTo(100)
        assertThat(result.addressStreet).isEqualTo("Test-Straße")
        assertThat(result.singleParent).isTrue()
        assertThat(result.persons).hasSize(3)
        assertThat(result.persons.count { it.isMainPerson }).isEqualTo(1)

        val mainPerson = result.persons.first { it.isMainPerson }
        assertThat(mainPerson.firstname).isEqualTo("Max")
        assertThat(mainPerson.lastname).isEqualTo("Mustermann")
        assertThat(mainPerson.employer).isEqualTo("Employer 123")
        assertThat(mainPerson.income).isEqualTo(BigDecimal("1000"))
        assertThat(mainPerson.household).isEqualTo(result)

        // the pointer is only set once both rows exist - never by the converter
        assertThat(result.mainPerson).isNull()
    }

    @Test
    fun `map to existing entity reuses the stored main person row`() {
        val storedMainPerson = testHouseholdEntity1.persons.first { it.isMainPerson }

        val updatedHousehold = testHousehold.copy(
            validUntil = LocalDate.now().plusYears(1),
            pendingCostContribution = BigDecimal.TEN,
            persons = listOf(
                testMainPerson.copy(
                    lastname = "updated-lastname",
                    firstname = "updated-firstname",
                    birthDate = LocalDate.now(),
                    gender = PersonGender.MALE,
                    employer = "updated-employer",
                    income = BigDecimal.TEN,
                ),
                testHousehold.additionalPersons()[0].copy(
                    gender = PersonGender.FEMALE,
                    excludeFromHousehold = true,
                ),
            ),
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result).isSameAs(testHouseholdEntity1)
        assertThat(result.persons).hasSize(2)

        val mainPerson = result.persons.first { it.isMainPerson }
        assertThat(mainPerson).isSameAs(storedMainPerson)
        assertThat(mainPerson.firstname).isEqualTo("updated-firstname")
        assertThat(mainPerson.lastname).isEqualTo("updated-lastname")
        assertThat(mainPerson.gender).isEqualTo(Gender.MALE)
        assertThat(mainPerson.employer).isEqualTo("updated-employer")
        assertThat(mainPerson.income).isEqualTo(BigDecimal.TEN)

        val additionalPerson = result.persons.first { !it.isMainPerson }
        assertThat(additionalPerson.gender).isEqualTo(Gender.FEMALE)
        assertThat(additionalPerson.excludeFromHousehold).isTrue()
    }

    @Test
    fun `update household and prolongedAt is filled`() {
        val previousProlongedAt = LocalDateTime.now().minusYears(1)
        testHouseholdEntity1.prolongedAt = previousProlongedAt

        val validUntil = LocalDate.now().plusYears(1)
        val updatedHousehold = testHousehold.copy(
            validUntil = validUntil,
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result.prolongedAt).isAfter(previousProlongedAt)
    }

    @Test
    fun `update household without prolonging keeps the stored prolongedAt`() {
        val prolongedAt = LocalDateTime.now().minusHours(2)
        testHouseholdEntity1.prolongedAt = prolongedAt

        val updatedHousehold = testHousehold.copy(
            validUntil = testHouseholdEntity1.validUntil,
            telephoneNumber = "0043660999999",
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result.prolongedAt).isEqualTo(prolongedAt)
    }

    @Test
    fun `update household with an earlier validUntil keeps the stored prolongedAt`() {
        val prolongedAt = LocalDateTime.now().minusHours(2)
        testHouseholdEntity1.prolongedAt = prolongedAt

        val updatedHousehold = testHousehold.copy(
            validUntil = testHouseholdEntity1.validUntil.minusMonths(1),
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result.prolongedAt).isEqualTo(prolongedAt)
    }

    @Test
    fun `create household has no prolongedAt`() {
        val result = converter.mapHouseholdToEntity(testHouseholdForCreate)

        assertThat(result.prolongedAt).isNull()
    }

    @Test
    fun `update household and lock`() {
        val updatedHousehold = testHousehold.copy(
            locked = true,
            lockReason = "locked due to lorem ipsum",
            persons = listOf(testMainPerson),
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result.locked).isTrue()
        assertThat(result.lockedAt).isNotNull()
        assertThat(result.lockReason).isEqualTo(updatedHousehold.lockReason)
        assertThat(result.lockedBy).isEqualTo(testUserEntity)
    }

    @Test
    fun `update household and unlock`() {
        val updatedHousehold = testHousehold.copy(
            locked = false,
            lockReason = null,
            persons = listOf(testMainPerson.copy(id = 20)),
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity2)

        assertThat(result.locked).isFalse()
        assertThat(result.lockedAt).isNull()
        assertThat(result.lockReason).isNull()
        assertThat(result.lockedBy).isNull()
    }

    @Test
    fun `create household with income zero is set to null`() {
        val household = testHouseholdForCreate.copy(
            persons = listOf(
                testMainPerson.copy(id = null, income = BigDecimal.ZERO),
                testHousehold.additionalPersons()[0].copy(id = null, income = BigDecimal.ZERO),
                testHousehold.additionalPersons()[1].copy(id = null),
            ),
        )

        val result = converter.mapHouseholdToEntity(household)

        assertThat(result.persons.first { it.isMainPerson }.income).isNull()
        assertThat(result.persons.first { !it.isMainPerson }.income).isNull()
    }

    @Test
    fun `update household rejects a person id belonging to another household`() {
        val updatedHousehold = testHousehold.copy(
            persons = listOf(
                testMainPerson,
                // id 20 belongs to testHouseholdEntity2's main person, not this (testHouseholdEntity1) household
                testHousehold.additionalPersons()[0].copy(id = 20),
            ),
        )

        assertThatThrownBy { converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1) }
            .isInstanceOf(BusinessRuleException::class.java)
            .hasMessageContaining("20")
    }

    @Test
    fun `update household never renumbers the stored household even when the request carries a different id`() {
        val updatedHousehold = testHousehold.copy(id = 999)

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result.householdId).isEqualTo(testHouseholdEntity1.householdId)
    }

    @Test
    fun `update household swaps the main person between two existing persons`() {
        val newMainPersonId = 2L
        val oldMainPersonId = 1L

        val updatedHousehold = testHousehold.copy(
            persons = listOf(
                testHousehold.additionalPersons()[0].copy(id = newMainPersonId, isMainPerson = true),
                testMainPerson.copy(id = oldMainPersonId, isMainPerson = false),
                testHousehold.additionalPersons()[1],
            ),
        )

        val result = converter.mapHouseholdToEntity(updatedHousehold, testHouseholdEntity1)

        assertThat(result.persons).hasSize(3)
        assertThat(result.persons.count { it.isMainPerson }).isEqualTo(1)
        assertThat(result.persons.first { it.id == newMainPersonId }.isMainPerson).isTrue()
        assertThat(result.persons.first { it.id == oldMainPersonId }.isMainPerson).isFalse()
    }
}

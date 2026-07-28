package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Transactional
class HouseholdEntitySpecsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)

        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    @Test
    fun `firstnameContains returns null spec when firstname is null`() {
        assertThat(HouseholdEntity.Specs.firstnameContains(null)).isNull()
    }

    @Test
    fun `firstnameContains matches case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistHousehold(customizeMainPerson = { firstname = "Prefix-$tag-Suffix" })
        val notMatching = persistHousehold(customizeMainPerson = { firstname = "unrelated-${generateRandomLong()}" })
        testEntityManager.flush()

        val result = householdRepository.findAll(HouseholdEntity.Specs.firstnameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `lastnameContains returns null spec when lastname is null`() {
        assertThat(HouseholdEntity.Specs.lastnameContains(null)).isNull()
    }

    @Test
    fun `lastnameContains matches case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistHousehold(customizeMainPerson = { lastname = "Prefix-$tag-Suffix" })
        val notMatching = persistHousehold(customizeMainPerson = { lastname = "unrelated-${generateRandomLong()}" })
        testEntityManager.flush()

        val result = householdRepository.findAll(HouseholdEntity.Specs.lastnameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `postProcessingNecessary matches household whose main person is missing a required field`() {
        val tag = "Findme${generateRandomLong()}"
        val incomplete = persistHousehold(customizeMainPerson = {
            firstname = tag
            gender = null
        })
        val complete = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.postProcessingNecessary().and(HouseholdEntity.Specs.firstnameContains(tag)!!),
        )

        assertThat(result.map { it.id }).contains(incomplete.id).doesNotContain(complete.id)
    }

    @Test
    fun `postProcessingNecessary matches household whose additional person is missing required field`() {
        val tag = "Findme${generateRandomLong()}"
        val withIncompleteAddPerson = persistHousehold(customizeMainPerson = { firstname = tag })
        val incompleteAddPerson = PersonEntity().apply {
            household = withIncompleteAddPerson
            isMainPerson = false
            firstname = "child-${generateRandomLong()}"
            lastname = "child-${generateRandomLong()}"
            country = testCountry
            excludeFromHousehold = false
            receivesFamilyAllowance = false
            birthDate = null
            gender = null
        }
        withIncompleteAddPerson.persons.add(incompleteAddPerson)
        testEntityManager.persist(incompleteAddPerson)

        val complete = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.postProcessingNecessary().and(HouseholdEntity.Specs.firstnameContains(tag)!!),
        )

        assertThat(result.map { it.id }).contains(withIncompleteAddPerson.id).doesNotContain(complete.id)
    }

    @Test
    fun `pendingCostContribution matches households with a pending amount above zero`() {
        val tag = "Findme${generateRandomLong()}"
        val pending = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { pendingCostContribution = BigDecimal("10") },
        )
        val notPending = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { pendingCostContribution = BigDecimal.ZERO },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.pendingCostContribution().and(HouseholdEntity.Specs.firstnameContains(tag)!!),
        )

        assertThat(result.map { it.id }).contains(pending.id).doesNotContain(notPending.id)
    }

    @Test
    fun `validHousehold matches only households with a validUntil today or in the future`() {
        val tag = "Findme${generateRandomLong()}"
        val valid = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().plusDays(1) },
        )
        val validToday = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now() },
        )
        val expired = persistHousehold(
            customizeMainPerson = { firstname = tag },
            customize = { validUntil = LocalDate.now().minusDays(1) },
        )
        testEntityManager.flush()

        val result = householdRepository.findAll(
            HouseholdEntity.Specs.validHousehold().and(HouseholdEntity.Specs.firstnameContains(tag)!!),
        )

        assertThat(result.map { it.id })
            .contains(valid.id, validToday.id)
            .doesNotContain(expired.id)
    }

    @Test
    fun `orderByUpdatedAtDesc sorts the most recently updated household first`() {
        val tag = "Findme${generateRandomLong()}"
        val first = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        Thread.sleep(50)

        val second = persistHousehold(customizeMainPerson = { firstname = tag })
        testEntityManager.flush()

        val spec = HouseholdEntity.Specs.orderByUpdatedAtDesc(HouseholdEntity.Specs.firstnameContains(tag)!!)
        val result = householdRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(second.id, first.id)
    }

    /**
     * Households and persons reference each other, so the main person pointer can only be written
     * after both rows exist - the same two-step insert the application uses.
     */
    private fun persistHousehold(
        customizeMainPerson: PersonEntity.() -> Unit = {},
        customize: HouseholdEntity.() -> Unit = {},
    ): HouseholdEntity {
        val household = createHousehold(testUser.employee!!, testCountry)
        household.customize()
        household.persons.first { it.isMainPerson }.customizeMainPerson()

        testEntityManager.persist(household)
        testEntityManager.flush()

        household.mainPerson = household.persons.first { it.isMainPerson }
        testEntityManager.persist(household)
        testEntityManager.flush()

        return household
    }
}

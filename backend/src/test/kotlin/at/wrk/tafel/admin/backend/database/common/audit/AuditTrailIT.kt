package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogEntity
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.Pageable
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.support.TransactionTemplate

/**
 * Proves the audit trail against a real database and a real Hibernate flush.
 *
 * Deliberately **not** `@Transactional`: entries are written in `beforeCommit`, so a test that rolls
 * its transaction back would see an empty `audit_log` and pass while nothing worked. Every step here
 * therefore commits for real, and cleans up after itself.
 */
class AuditTrailIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var countryRepository: CountryRepository

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity
    private var householdId: Long = 0

    @BeforeEach
    fun beforeEach() {
        testUser = transactionTemplate.execute { userRepository.saveAndFlush(createUser()) }
        // `static_countries.code` is unique and the generator always produces "00", so the country
        // is created once and reused - these tests commit, unlike the rollback-per-test ones.
        testCountry = transactionTemplate.execute {
            countryRepository.findAll().firstOrNull() ?: countryRepository.saveAndFlush(createCountry())
        }

        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = testUser.username,
            authenticated = true,
        )
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
        transactionTemplate.execute {
            householdRepository.findByHouseholdId(householdId)?.let { household ->
                household.mainPerson = null
                householdRepository.saveAndFlush(household)
                householdRepository.delete(household)
            }
        }
        transactionTemplate.execute {
            auditLogRepository.deleteAll(entriesForHousehold())
            userRepository.deleteById(testUser.id!!)
        }
    }

    @Test
    fun `creating a household records an insert entry for the household and its person`() {
        createTestHousehold()

        val entries = transactionTemplate.execute { entriesForHousehold() }

        assertThat(entries.map { it.entityType to it.operation.name })
            .contains("Household" to "INSERT", "Person" to "INSERT")

        val householdEntry = entries.first { it.entityType == "Household" && it.operation.name == "INSERT" }
        assertThat(householdEntry.actorUsername).isEqualTo(testUser.username)
        assertThat(householdEntry.actorUserId).isEqualTo(testUser.id)
        assertThat(householdEntry.businessKey).isEqualTo(householdId.toString())
        assertThat(householdEntry.changedFields).contains("addressCity")
    }

    @Test
    fun `updating a household records only the fields that changed, with their previous values`() {
        createTestHousehold()
        transactionTemplate.execute { auditLogRepository.deleteAll(entriesForHousehold()) }

        transactionTemplate.execute {
            val household = householdRepository.findByHouseholdId(householdId)!!
            household.addressCity = "Graz"
            householdRepository.saveAndFlush(household)
        }

        val entries = transactionTemplate.execute { entriesForHousehold() }
        val updateEntry = entries.single { it.entityType == "Household" && it.operation.name == "UPDATE" }

        assertThat(updateEntry.changedFields).contains("addressCity").contains("Graz")
        assertThat(updateEntry.changedFields).doesNotContain("telephoneNumber")
        // The bookkeeping columns move on every write and would otherwise be in every single entry.
        assertThat(updateEntry.changedFields).doesNotContain("updatedAt").doesNotContain("searchText")
    }

    @Test
    fun `deleting a household keeps its last known values and its business key`() {
        createTestHousehold()
        transactionTemplate.execute { auditLogRepository.deleteAll(entriesForHousehold()) }

        transactionTemplate.execute {
            val household = householdRepository.findByHouseholdId(householdId)!!
            household.mainPerson = null
            householdRepository.saveAndFlush(household)
            householdRepository.delete(household)
        }

        val entries = transactionTemplate.execute { entriesForHousehold() }
        val deleteEntry = entries.single { it.entityType == "Household" && it.operation.name == "DELETE" }

        assertThat(deleteEntry.businessKey).isEqualTo(householdId.toString())
        assertThat(deleteEntry.changedFields).contains("addressCity")
        assertThat(entries.map { it.entityType to it.operation.name }).contains("Person" to "DELETE")
    }

    @Test
    fun `a rolled back change is never recorded`() {
        createTestHousehold()
        transactionTemplate.execute { auditLogRepository.deleteAll(entriesForHousehold()) }

        runCatching {
            transactionTemplate.execute {
                val household = householdRepository.findByHouseholdId(householdId)!!
                household.addressCity = "Never committed"
                householdRepository.saveAndFlush(household)
                throw IllegalStateException("rolling back on purpose")
            }
        }

        assertThat(transactionTemplate.execute { entriesForHousehold() }).isEmpty()
    }

    @Test
    fun `the acting user is stamped onto the row itself as well`() {
        createTestHousehold()

        val household = transactionTemplate.execute { householdRepository.findByHouseholdId(householdId) }!!

        assertThat(household.createdBy).isEqualTo(testUser.username)
        assertThat(household.updatedBy).isEqualTo(testUser.username)
    }

    private fun createTestHousehold() {
        transactionTemplate.execute {
            val household = householdRepository.saveAndFlush(createHousehold(testUser.employee, testCountry))
            household.mainPerson = household.persons.first()
            householdRepository.saveAndFlush(household)
            householdId = household.householdId
        }
    }

    private fun entriesForHousehold(): List<AuditLogEntity> = auditLogRepository
        .findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(
            businessKey = householdId.toString(),
            entityTypes = AuditScope.householdScopedEntityTypes,
            pageable = Pageable.unpaged(),
        ).content
}

package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.context.WebApplicationContext

/**
 * A household locked after a screen loaded it must still not get a ticket: the refusal comes from
 * `POST /api/distributions/households` itself, through the real controller, the
 * `@TafelActiveDistributionRequired` interceptor and a real database - not from the screen's own
 * `locked` check, which only sees what it loaded.
 *
 * Fixtures are committed for real (like [DistributionConcurrentAssignHouseholdIT]), since the request
 * runs the service's own transaction, and cleaned up afterwards. MockMvc is built from the
 * `WebApplicationContext` directly (see `GenericExceptionHandlerIT`), so the security filter chain
 * is not in play - the authentication is put into the security context the way the JWT filter would.
 */
class DistributionAssignLockedHouseholdIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var webApplicationContext: WebApplicationContext

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var distributionRepository: DistributionRepository

    @Autowired
    private lateinit var distributionHouseholdRepository: DistributionHouseholdRepository

    @Autowired
    private lateinit var householdRepository: HouseholdRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var countryRepository: CountryRepository

    private lateinit var mockMvc: MockMvc
    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity
    private lateinit var household: HouseholdEntity
    private var distributionId: Long = 0

    @BeforeEach
    fun beforeEach() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build()

        testUser = transactionTemplate.execute { userRepository.saveAndFlush(createUser()) }!!
        testCountry = transactionTemplate.execute {
            countryRepository.findAll().firstOrNull() ?: countryRepository.saveAndFlush(createCountry())
        }!!
        distributionId = transactionTemplate.execute {
            distributionRepository.saveAndFlush(createDistribution(testUser)).id!!
        }!!
        household = transactionTemplate.execute {
            val created = householdRepository.saveAndFlush(createHousehold(testUser, testCountry))
            created.mainPerson = created.persons.first { it.isMainPerson }
            householdRepository.saveAndFlush(created)
        }!!

        SecurityContextHolder.setContext(
            SecurityContextImpl(
                TafelJwtAuthentication(
                    tokenValue = "TOKEN",
                    username = testUser.username,
                    authenticated = true,
                    authorities = listOf(SimpleGrantedAuthority(UserPermissions.CHECKIN.key)),
                    userId = testUser.id,
                ),
            ),
        )
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
        transactionTemplate.executeWithoutResult {
            distributionHouseholdRepository.deleteAll(distributionHouseholdRepository.findByDistributionId(distributionId))
            distributionRepository.findById(distributionId).ifPresent { distributionRepository.delete(it) }
            householdRepository.findById(household.id!!).ifPresent {
                it.mainPerson = null
                householdRepository.saveAndFlush(it)
                householdRepository.delete(it)
            }
            userRepository.deleteById(testUser.id!!)
        }
    }

    private fun lockHousehold() {
        transactionTemplate.executeWithoutResult {
            householdRepository.findById(household.id!!).get().locked = true
        }
    }

    private fun assign(ticketNumber: Int) = mockMvc.perform(
        post("/api/distributions/households")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"householdId":${household.householdId},"ticketNumber":$ticketNumber}"""),
    )

    @Test
    fun `a household locked behind the screen's back gets no ticket`() {
        lockHousehold()

        assign(7)
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value("Kunde Nr. ${household.householdId} ist gesperrt und kann kein Ticket erhalten!"))

        assertThat(transactionTemplate.execute { distributionHouseholdRepository.findByDistributionId(distributionId) }).isEmpty()
    }

    @Test
    fun `a household locked after its check-in may hand in the ticket it already holds`() {
        assign(8).andExpect(status().isNoContent)
        lockHousehold()

        assign(8).andExpect(status().isNoContent)
        assign(9).andExpect(status().isBadRequest)

        val entries = transactionTemplate.execute { distributionHouseholdRepository.findByDistributionId(distributionId) }!!
        assertThat(entries.map { it.ticketNumber }).containsExactly(8)
    }
}

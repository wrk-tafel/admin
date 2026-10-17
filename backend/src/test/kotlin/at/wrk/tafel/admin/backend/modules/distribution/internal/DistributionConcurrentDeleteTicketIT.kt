package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
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
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.transaction.support.TransactionTemplate
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Covers issue #3873: a double click or a held Enter key on the check-in screen's delete button
 * sent a burst of deletes for the same household's ticket. Every one of them read the same row, so
 * all but one failed - with a 500 when the delete of an already deleted row rolled the transaction
 * back, with a 400 when the row was gone by the time it was read. Deleting is now idempotent, so
 * every request of the burst has to succeed and the ticket is gone exactly once. A `CyclicBarrier`
 * lines the threads up so the requests actually overlap, same shape as
 * [DistributionConcurrentAssignHouseholdIT].
 */
class DistributionConcurrentDeleteTicketIT : TafelBaseIntegrationTest() {

    private companion object {
        const val PARALLEL_REQUESTS = 10
    }

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var distributionService: DistributionService

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

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity
    private var distributionId: Long = 0
    private val householdIds = mutableListOf<Long>()

    @BeforeEach
    fun beforeEach() {
        testUser = transactionTemplate.execute { userRepository.saveAndFlush(createUser()) }!!
        testCountry = transactionTemplate.execute {
            countryRepository.findAll().firstOrNull() ?: countryRepository.saveAndFlush(createCountry())
        }!!
        distributionId = transactionTemplate.execute {
            distributionRepository.saveAndFlush(createDistribution(testUser)).id!!
        }!!
    }

    @AfterEach
    fun afterEach() {
        transactionTemplate.executeWithoutResult {
            distributionHouseholdRepository.deleteAll(
                distributionHouseholdRepository.findAll().filter { it.distribution.id == distributionId },
            )
            distributionRepository.findById(distributionId).ifPresent { distributionRepository.delete(it) }
            householdIds.forEach { id ->
                householdRepository.findById(id).ifPresent { household ->
                    household.mainPerson = null
                    householdRepository.saveAndFlush(household)
                    householdRepository.delete(household)
                }
            }
            userRepository.deleteById(testUser.id!!)
        }
    }

    private fun createTestHousehold(): HouseholdEntity = transactionTemplate.execute {
        val household = householdRepository.saveAndFlush(createHousehold(testUser, testCountry))
        household.mainPerson = household.persons.first { it.isMainPerson }
        householdRepository.saveAndFlush(household)
    }!!.also { householdIds.add(it.id!!) }

    private fun <T> runWithAuthentication(barrier: CyclicBarrier, block: () -> T): T {
        SecurityContextHolder.setContext(SecurityContextImpl(TafelAuthentication(sessionKey = "TOKEN", username = testUser.username)))
        return try {
            barrier.await(10, TimeUnit.SECONDS)
            block()
        } finally {
            SecurityContextHolder.clearContext()
        }
    }

    @Test
    fun `concurrent deletes of the same household's ticket all succeed and delete it once`() {
        val household = createTestHousehold()
        val otherHousehold = createTestHousehold()
        SecurityContextHolder.setContext(SecurityContextImpl(TafelAuthentication(sessionKey = "TOKEN", username = testUser.username)))
        try {
            distributionService.assignHouseholdToDistribution(household.householdId, 1)
            distributionService.assignHouseholdToDistribution(otherHousehold.householdId, 2)
        } finally {
            SecurityContextHolder.clearContext()
        }

        val barrier = CyclicBarrier(PARALLEL_REQUESTS)
        val executor = Executors.newFixedThreadPool(PARALLEL_REQUESTS)
        try {
            val futures = (1..PARALLEL_REQUESTS).map {
                executor.submit<Result<Unit>> {
                    runWithAuthentication(barrier) {
                        runCatching { distributionService.deleteCurrentTicket(household.householdId) }
                    }
                }
            }

            val results = futures.map { it.get(10, TimeUnit.SECONDS) }

            assertThat(results.mapNotNull { it.exceptionOrNull() }).isEmpty()

            val storedEntries = transactionTemplate.execute {
                distributionHouseholdRepository.findByDistributionId(distributionId)
            }!!
            assertThat(storedEntries.map { it.household.householdId }).containsExactly(otherHousehold.householdId)
        } finally {
            executor.shutdownNow()
        }
    }
}

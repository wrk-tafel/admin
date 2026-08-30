package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
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
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
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
 * Covers issue #3560: `assignHouseholdToDistribution`'s ticket-number/household check-then-act is a
 * race against two `UNIQUE` constraints (`uc_distributionid_ticketnumber` and
 * `uq_distributions_households_distribution_household`). Both scenarios are now serialized by
 * `AdvisoryLockKey.ASSIGN_HOUSEHOLD_TO_DISTRIBUTION` - a `CyclicBarrier` lines the threads up so the
 * requests actually overlap, same shape as [DistributionConcurrentCreateIT].
 */
class DistributionConcurrentAssignHouseholdIT : TafelBaseIntegrationTest() {

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
        val household = householdRepository.saveAndFlush(createHousehold(testUser.employee!!, testCountry))
        household.mainPerson = household.persons.first { it.isMainPerson }
        householdRepository.saveAndFlush(household)
    }!!.also { householdIds.add(it.id!!) }

    private fun <T> runWithAuthentication(barrier: CyclicBarrier, block: () -> T): T {
        SecurityContextHolder.setContext(SecurityContextImpl(TafelJwtAuthentication(tokenValue = "TOKEN", username = testUser.username)))
        return try {
            barrier.await(10, TimeUnit.SECONDS)
            block()
        } finally {
            SecurityContextHolder.clearContext()
        }
    }

    @Test
    fun `only one of many concurrent check-ins with the same ticket number succeeds`() {
        val households = (1..PARALLEL_REQUESTS).map { createTestHousehold() }
        val ticketNumber = 42

        val barrier = CyclicBarrier(PARALLEL_REQUESTS)
        val executor = Executors.newFixedThreadPool(PARALLEL_REQUESTS)
        try {
            val futures = households.map { household ->
                executor.submit<Result<Unit>> {
                    runWithAuthentication(barrier) {
                        try {
                            distributionService.assignHouseholdToDistribution(household.householdId, ticketNumber)
                            Result.success(Unit)
                        } catch (e: ConflictException) {
                            Result.failure(e)
                        }
                    }
                }
            }

            val results = futures.map { it.get(10, TimeUnit.SECONDS) }

            assertThat(results.count { it.isSuccess }).isEqualTo(1)
            assertThat(results.count { it.isFailure }).isEqualTo(PARALLEL_REQUESTS - 1)
            results.filter { it.isFailure }.forEach {
                assertThat(it.exceptionOrNull()).isInstanceOf(ConflictException::class.java)
            }

            val storedEntries = transactionTemplate.execute {
                distributionHouseholdRepository.findByDistributionId(distributionId)
            }!!
            assertThat(storedEntries).hasSize(1)
            assertThat(storedEntries.first().ticketNumber).isEqualTo(ticketNumber)
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `concurrent check-ins of the same household with different ticket numbers never fail`() {
        val household = createTestHousehold()

        val barrier = CyclicBarrier(PARALLEL_REQUESTS)
        val executor = Executors.newFixedThreadPool(PARALLEL_REQUESTS)
        try {
            val futures = (1..PARALLEL_REQUESTS).map { i ->
                executor.submit<Result<Unit>> {
                    runWithAuthentication(barrier) {
                        try {
                            distributionService.assignHouseholdToDistribution(household.householdId, i)
                            Result.success(Unit)
                        } catch (e: ConflictException) {
                            Result.failure(e)
                        }
                    }
                }
            }

            val results = futures.map { it.get(10, TimeUnit.SECONDS) }

            assertThat(results.count { it.isSuccess }).isEqualTo(PARALLEL_REQUESTS)

            val storedEntries = transactionTemplate.execute {
                distributionHouseholdRepository.findByDistributionId(distributionId)
            }!!
            assertThat(storedEntries).hasSize(1)
            assertThat(storedEntries.first().household.householdId).isEqualTo(household.householdId)
        } finally {
            executor.shutdownNow()
        }
    }
}

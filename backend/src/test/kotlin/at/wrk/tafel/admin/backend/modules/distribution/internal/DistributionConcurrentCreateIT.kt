package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Automates the scenario manually covered by `_scripts/test-concurrent-distributions.sh`: many
 * parallel `createNewDistribution()` calls must yield exactly one success, with the rest failing
 * fast via `AdvisoryLockKey.CREATE_DISTRIBUTION` (see [at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService])
 * rather than racing each other into two open distributions. A `CyclicBarrier` lines the threads
 * up so the requests actually overlap, instead of merely running "soon after each other".
 */
class DistributionConcurrentCreateIT : TafelBaseIntegrationTest() {

    private companion object {
        const val PARALLEL_REQUESTS = 10
    }

    @Autowired
    private lateinit var distributionService: DistributionService

    @Autowired
    private lateinit var distributionRepository: DistributionRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `only one of many concurrent createNewDistribution calls succeeds`() {
        val testUser = userRepository.save(createUser())
        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN", username = testUser.username)

        val barrier = CyclicBarrier(PARALLEL_REQUESTS)
        val executor = Executors.newFixedThreadPool(PARALLEL_REQUESTS)
        try {
            val futures = (1..PARALLEL_REQUESTS).map {
                executor.submit<Result<Unit>> {
                    SecurityContextHolder.setContext(SecurityContextImpl(authentication))
                    try {
                        barrier.await(10, TimeUnit.SECONDS)
                        distributionService.createNewDistribution()
                        Result.success(Unit)
                    } catch (e: ConflictException) {
                        Result.failure(e)
                    } finally {
                        SecurityContextHolder.clearContext()
                    }
                }
            }

            val results = futures.map { it.get(10, TimeUnit.SECONDS) }

            assertThat(results.count { it.isSuccess }).isEqualTo(1)
            assertThat(results.count { it.isFailure }).isEqualTo(PARALLEL_REQUESTS - 1)
            results.filter { it.isFailure }.forEach {
                assertThat(it.exceptionOrNull()).isInstanceOf(ConflictException::class.java)
            }

            assertThat(distributionRepository.findAll()).hasSize(1)
        } finally {
            executor.shutdownNow()
        }
    }
}

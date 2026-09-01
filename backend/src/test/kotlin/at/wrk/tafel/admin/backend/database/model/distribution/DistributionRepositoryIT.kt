package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Transactional
class DistributionRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var distributionRepository: DistributionRepository

    private lateinit var testUser: UserEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)
    }

    /**
     * `getDistributionsForYear` is what the year-to-date statistic CSV exporters
     * (`DailyReportsExporter`/`FoodCollectionsExporter`) treat as "every finished distribution of the
     * year" - a manual mail resend running while a new distribution is open must not see that
     * still-open one, or its always-present but empty statistic row is exported as if it were a
     * completed day. See issue #3599.
     */
    @Test
    fun `getDistributionsForYear only returns ended distributions`() {
        val year = LocalDateTime.now().year
        val endedDistribution = createDistribution(testUser).apply {
            endedAt = LocalDateTime.now()
        }
        val openDistribution = createDistribution(testUser)
        testEntityManager.persist(endedDistribution)
        testEntityManager.persist(openDistribution)
        testEntityManager.flush()

        val result = distributionRepository.getDistributionsForYear(year)

        assertThat(result.map { it.id }).contains(endedDistribution.id)
        assertThat(result.map { it.id }).doesNotContain(openDistribution.id)
    }
}

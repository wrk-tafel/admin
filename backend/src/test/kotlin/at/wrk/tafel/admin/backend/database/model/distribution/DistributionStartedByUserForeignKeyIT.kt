package at.wrk.tafel.admin.backend.database.model.distribution

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createDistribution
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

/**
 * `startedby_userid` has been nullable at the DB level with `on delete set null` since
 * `R__00027_user_distributions_fk_cascade.sql` - but `DistributionEntity.startedByUser` stayed
 * mapped as a non-null `UserEntity` until now, a mismatch the compiler can't catch (Hibernate sets
 * the field via reflection, bypassing Kotlin's null-safety). Proves the mapping now matches the
 * schema by exercising the real FK cascade against Postgres, not just the type.
 */
class DistributionStartedByUserForeignKeyIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var distributionRepository: DistributionRepository

    @Test
    fun `deleting the user who started a distribution nulls startedByUser instead of failing to load`() {
        val user = userRepository.saveAndFlush(createUser())
        val distribution = distributionRepository.saveAndFlush(createDistribution(user))
        val distributionId = distribution.id!!

        userRepository.delete(user)

        val reloaded = distributionRepository.findById(distributionId).orElseThrow()
        assertThat(reloaded.startedByUser).isNull()

        distributionRepository.delete(reloaded)
    }
}

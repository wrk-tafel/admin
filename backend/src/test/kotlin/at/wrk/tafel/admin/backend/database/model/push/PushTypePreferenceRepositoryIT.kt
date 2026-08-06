package at.wrk.tafel.admin.backend.database.model.push

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

@Transactional
class PushTypePreferenceRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var pushTypePreferenceRepository: PushTypePreferenceRepository

    @Test
    fun `findAllByUserId only returns preferences of that user`() {
        val user1 = persistUser()
        val user2 = persistUser()
        val preferenceUser1 = persistPreference(user1, PushNotificationType.DISTRIBUTION_STARTED, enabled = false)
        persistPreference(user2, PushNotificationType.DISTRIBUTION_STARTED, enabled = false)
        testEntityManager.flush()

        val result = pushTypePreferenceRepository.findAllByUserId(user1.id!!)

        assertThat(result.map { it.id }).containsExactly(preferenceUser1.id)
    }

    @Test
    fun `findByUserIdAndNotificationType finds the matching row`() {
        val user = persistUser()
        persistPreference(user, PushNotificationType.DISTRIBUTION_STARTED, enabled = false)
        val closedPreference = persistPreference(user, PushNotificationType.DISTRIBUTION_CLOSED, enabled = false)
        testEntityManager.flush()

        val result = pushTypePreferenceRepository.findByUserIdAndNotificationType(user.id!!, PushNotificationType.DISTRIBUTION_CLOSED)

        assertThat(result?.id).isEqualTo(closedPreference.id)
    }

    @Test
    fun `findByUserIdAndNotificationType returns null when no row exists for that type`() {
        val user = persistUser()
        testEntityManager.flush()

        val result = pushTypePreferenceRepository.findByUserIdAndNotificationType(user.id!!, PushNotificationType.DISTRIBUTION_STARTED)

        assertThat(result).isNull()
    }

    private fun persistUser(): UserEntity {
        val user = createUser()
        testEntityManager.persist(user)
        return user
    }

    private fun persistPreference(user: UserEntity, type: PushNotificationType, enabled: Boolean): PushTypePreferenceEntity {
        val preference = PushTypePreferenceEntity().apply {
            this.user = user
            this.notificationType = type
            this.enabled = enabled
        }
        testEntityManager.persist(preference)
        return preference
    }
}

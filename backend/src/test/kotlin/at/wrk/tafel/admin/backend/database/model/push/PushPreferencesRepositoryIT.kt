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
class PushPreferencesRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var pushPreferencesRepository: PushPreferencesRepository

    @Test
    fun `findByUserId finds the preferences row of that user`() {
        val user = persistUser()
        val preferences = persistPreferences(user, enabled = false)
        testEntityManager.flush()

        val result = pushPreferencesRepository.findByUserId(user.id!!)

        assertThat(result?.id).isEqualTo(preferences.id)
        assertThat(result?.enabled).isFalse()
    }

    @Test
    fun `findByUserId returns null when the user has no preferences row`() {
        val user = persistUser()
        testEntityManager.flush()

        assertThat(pushPreferencesRepository.findByUserId(user.id!!)).isNull()
    }

    @Test
    fun `findByUserId does not return another user's preferences`() {
        val owner = persistUser()
        val stranger = persistUser()
        persistPreferences(owner)
        testEntityManager.flush()

        assertThat(pushPreferencesRepository.findByUserId(stranger.id!!)).isNull()
    }

    private fun persistUser(): UserEntity {
        val user = createUser()
        testEntityManager.persist(user)
        return user
    }

    private fun persistPreferences(user: UserEntity, enabled: Boolean = true): PushPreferencesEntity {
        val preferences = PushPreferencesEntity().apply {
            this.user = user
            this.enabled = enabled
        }
        testEntityManager.persist(preferences)
        return preferences
    }
}

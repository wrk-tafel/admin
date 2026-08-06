package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

@Transactional
class UserRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `findAllByAuthoritiesNameInAndEnabledTrue matches by any of the given authority names`() {
        val leadershipUser = persistUserWithAuthority("SUPERVISOR")
        val otherPermissionUser = persistUserWithAuthority("CHECKIN")
        testEntityManager.flush()

        val result = userRepository.findAllByAuthoritiesNameInAndEnabledTrue(listOf("SUPERVISOR", "SETTINGS"))

        assertThat(result.map { it.id }).contains(leadershipUser.id).doesNotContain(otherPermissionUser.id)
    }

    @Test
    fun `findAllByAuthoritiesNameInAndEnabledTrue excludes disabled users`() {
        val disabledUser = persistUserWithAuthority("SUPERVISOR") { enabled = false }
        testEntityManager.flush()

        val result = userRepository.findAllByAuthoritiesNameInAndEnabledTrue(listOf("SUPERVISOR"))

        assertThat(result.map { it.id }).doesNotContain(disabledUser.id)
    }

    private fun persistUserWithAuthority(authorityName: String, customize: UserEntity.() -> Unit = {}): UserEntity {
        val user = createUser()
        user.customize()
        val authority = UserAuthorityEntity().apply {
            this.user = user
            this.name = authorityName
        }
        user.authorities = mutableListOf(authority)
        testEntityManager.persist(user)
        return user
    }
}

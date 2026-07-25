package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

@Transactional
class UserEntitySpecsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `usernameContains returns null spec when username is null`() {
        assertThat(UserEntity.Specs.usernameContains(null)).isNull()
    }

    @Test
    fun `usernameContains matches case insensitively`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistUser { username = "prefix-$tag-suffix" }
        val notMatching = persistUser()
        testEntityManager.flush()

        val result = userRepository.findAll(UserEntity.Specs.usernameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `firstnameContains returns null spec when firstname is null`() {
        assertThat(UserEntity.Specs.firstnameContains(null)).isNull()
    }

    @Test
    fun `firstnameContains matches case insensitively via employee join`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistUser { employee!!.firstname = "prefix-$tag-suffix" }
        val notMatching = persistUser()
        testEntityManager.flush()

        val result = userRepository.findAll(UserEntity.Specs.firstnameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `lastnameContains returns null spec when lastname is null`() {
        assertThat(UserEntity.Specs.lastnameContains(null)).isNull()
    }

    @Test
    fun `lastnameContains matches case insensitively via employee join`() {
        val tag = "Findme${generateRandomLong()}"
        val matching = persistUser { employee!!.lastname = "prefix-$tag-suffix" }
        val notMatching = persistUser()
        testEntityManager.flush()

        val result = userRepository.findAll(UserEntity.Specs.lastnameContains(tag.uppercase())!!)

        assertThat(result.map { it.id }).contains(matching.id).doesNotContain(notMatching.id)
    }

    @Test
    fun `enabledEquals returns null spec when enabled is null`() {
        assertThat(UserEntity.Specs.enabledEquals(null)).isNull()
    }

    @Test
    fun `enabledEquals matches by enabled flag`() {
        val tag = "Findme${generateRandomLong()}"
        val enabledUser = persistUser {
            username = "prefix-$tag-enabled"
            enabled = true
        }
        val disabledUser = persistUser {
            username = "prefix-$tag-disabled"
            enabled = false
        }
        testEntityManager.flush()

        val result = userRepository.findAll(
            UserEntity.Specs.enabledEquals(true)!!.and(UserEntity.Specs.usernameContains(tag)!!)
        )

        assertThat(result.map { it.id }).contains(enabledUser.id).doesNotContain(disabledUser.id)
    }

    @Test
    fun `orderByUpdatedAtDesc sorts the most recently updated user first`() {
        val tag = "Findme${generateRandomLong()}"
        val first = persistUser { username = "prefix-$tag-1" }
        testEntityManager.flush()

        Thread.sleep(50)

        val second = persistUser { username = "prefix-$tag-2" }
        testEntityManager.flush()

        val spec = UserEntity.Specs.orderByUpdatedAtDesc(UserEntity.Specs.usernameContains(tag)!!)
        val result = userRepository.findAll(spec)

        assertThat(result.map { it.id }).containsExactly(second.id, first.id)
    }

    private fun persistUser(customize: UserEntity.() -> Unit = {}): UserEntity {
        val user = createUser()
        user.customize()
        testEntityManager.persist(user)
        return user
    }

}

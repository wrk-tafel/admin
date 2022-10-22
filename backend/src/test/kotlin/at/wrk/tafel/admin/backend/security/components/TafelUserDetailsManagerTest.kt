package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.database.entities.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.security.model.TafelUser
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.util.*

@ExtendWith(MockKExtension::class)
class TafelUserDetailsManagerTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var manager: TafelUserDetailsManager

    @Test
    fun `loadUserByUsername - user not found`() {
        every { userRepository.findByUsername(any()) } returns Optional.empty()

        val userDetails = manager.loadUserByUsername("test")

        assertThat(userDetails).isNull()

        verify(exactly = 1) {
            userRepository.findByUsername("test")
        }
    }

    @Test
    fun `loadUserByUsername - user found and mapped`() {
        val userAuthorityEntity1 = UserAuthorityEntity()
        userAuthorityEntity1.name = "AUT1"

        val userAuthorityEntity2 = UserAuthorityEntity()
        userAuthorityEntity2.name = "AUT2"

        val userEntity = UserEntity()
        userEntity.username = "test-username"
        userEntity.password = "test-password"
        userEntity.enabled = true
        userEntity.id = 0
        userEntity.personnelNumber = "test-personnelnumber"
        userEntity.firstname = "test-firstname"
        userEntity.lastname = "test-lastname"
        userEntity.authorities = mutableListOf(userAuthorityEntity1, userAuthorityEntity2)

        every { userRepository.findByUsername(any()) } returns Optional.of(userEntity)

        val userDetails = manager.loadUserByUsername("test") as TafelUser

        assertThat(userDetails).isNotNull
        assertThat(userDetails.username).isEqualTo(userEntity.username)
        assertThat(userDetails.password).isEqualTo(userEntity.password)
        assertThat(userDetails.isEnabled).isTrue
        assertThat(userDetails.id).isEqualTo(userEntity.id)
        assertThat(userDetails.personnelNumber).isEqualTo(userEntity.personnelNumber)
        assertThat(userDetails.firstname).isEqualTo(userEntity.firstname)
        assertThat(userDetails.lastname).isEqualTo(userEntity.lastname)
        assertThat(userDetails.isAccountNonExpired).isTrue
        assertThat(userDetails.isAccountNonLocked).isTrue
        assertThat(userDetails.isCredentialsNonExpired).isTrue
        assertThat(userDetails.authorities).hasSameElementsAs(
            listOf(
                SimpleGrantedAuthority(userAuthorityEntity1.name),
                SimpleGrantedAuthority(userAuthorityEntity2.name)
            )
        )

        verify(exactly = 1) {
            userRepository.findByUsername("test")
        }
    }

    @Test
    fun `createUser - not implemented`() {
        assertThrows<NotImplementedError> { manager.createUser(null) }
    }

    @Test
    fun `updateUser - not implemented`() {
        assertThrows<NotImplementedError> { manager.updateUser(null) }
    }

    @Test
    fun `deleteUser - not implemented`() {
        assertThrows<NotImplementedError> { manager.deleteUser(null) }
    }

    @Test
    fun `changePassword - not implemented`() {
        assertThrows<NotImplementedError> { manager.changePassword(null, null) }
    }

    @Test
    fun `userExists - doesnt exist`() {
        every { userRepository.existsByUsername(any()) } returns false

        val exists = manager.userExists("test")

        assertThat(exists).isFalse
        verify(exactly = 1) {
            userRepository.existsByUsername("test")
        }
    }

    @Test
    fun `userExists - exists`() {
        every { userRepository.existsByUsername(any()) } returns true

        val exists = manager.userExists("test")

        assertThat(exists).isTrue
        verify(exactly = 1) {
            userRepository.existsByUsername("test")
        }
    }

}

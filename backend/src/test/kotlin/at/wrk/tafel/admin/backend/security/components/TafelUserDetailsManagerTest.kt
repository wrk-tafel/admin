package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.config.WebSecurityConfig
import at.wrk.tafel.admin.backend.database.entities.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.passay.PasswordValidator
import org.passay.RuleResult
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.DelegatingPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.*

@ExtendWith(MockKExtension::class)
class TafelUserDetailsManagerTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @SpyK
    private var passwordEncoder: PasswordEncoder =
        DelegatingPasswordEncoder("argon2", mapOf("argon2" to Argon2PasswordEncoder(16, 32, 1, 16384, 2)))

    @SpyK
    private var passwordValidator: PasswordValidator = WebSecurityConfig.passwordValidator

    @InjectMockKs
    private lateinit var manager: TafelUserDetailsManager

    private lateinit var testUserEntityPassword: String

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication(tokenValue = "TOKEN", testUser.username)
        every { userRepository.findByUsername(testUser.username) } returns Optional.of(testUserEntity)
        testUserEntityPassword = testUserEntity.password!!
    }

    @AfterEach
    fun afterEach() {
        testUserEntity.password = testUserEntityPassword
    }

    @Test
    fun `loadUserByUsername - user not found`() {
        every { userRepository.findByUsername(any()) } returns Optional.empty()

        assertThrows<UsernameNotFoundException> {
            manager.loadUserByUsername("test")
        }

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
        userEntity.passwordChangeRequired = true

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
        assertThat(userDetails.passwordChangeRequired).isTrue
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
    fun `changePassword - passwords matching`() {
        val currentPassword = "12345"
        val newPassword = "67890"
        val newPasswordEncoded = "encoded-pwd"

        every { passwordValidator.validate(any()) } returns RuleResult(true)
        every { passwordEncoder.encode(newPassword) } returns newPasswordEncoded
        every { userRepository.save(any()) } returns testUserEntity

        val currentPasswordHash = testUserEntity.password

        manager.changePassword(currentPassword, newPassword)

        verify { userRepository.findByUsername(testUser.username) }
        verify { passwordEncoder.matches(currentPassword, currentPasswordHash) }
        verify { passwordEncoder.encode(newPassword) }
        verify(exactly = 1) {
            userRepository.save(withArg {
                assertThat(it.password).isEqualTo(newPasswordEncoded)
                assertThat(it.passwordChangeRequired).isFalse()
            })
        }
    }

    @Test
    fun `changePassword - passwords not matching`() {
        every { passwordValidator.validate(any()) } returns RuleResult(true)

        val currentPassword = "wrong-password"
        val newPassword = "67890"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword(currentPassword, newPassword)
        }
        assertThat(exception.message).isEqualTo("Aktuelles Passwort ist falsch!")

        verify { userRepository.findByUsername(testUser.username) }
        verify { passwordEncoder.matches(currentPassword, testUserEntity.password) }
        verify(exactly = 0) { userRepository.save(testUserEntity) }
    }

    @Test
    fun `changePassword - new password invalid`() {
        every { passwordValidator.validate(any()) } returns RuleResult(false)

        val currentPassword = "12345"
        val newPassword = "67890"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword(currentPassword, newPassword)
        }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")

        verify { userRepository.findByUsername(testUser.username) }
        verify { passwordEncoder.matches(currentPassword, testUserEntity.password) }
        verify {
            passwordValidator.validate(withArg {
                assertThat(it.username).isEqualTo(testUserEntity.username)
                assertThat(it.password).isEqualTo(newPassword)
            })
        }
        verify(exactly = 0) { userRepository.save(testUserEntity) }
    }

    @Test
    fun `changePassword - password too short`() {
        val newPassword = "67890"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword("12345", newPassword)
        }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")
        assertThat(exception.validationDetails).hasSameElementsAs(
            listOf(
                "Mindestlänge: 8, Maximale Länge: 50"
            )
        )
    }

    @Test
    fun `changePassword - password too long`() {
        val newPassword = "6789067890678906789067890678906789067890678906789067890"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword("12345", newPassword)
        }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")
        assertThat(exception.validationDetails).hasSameElementsAs(
            listOf(
                "Mindestlänge: 8, Maximale Länge: 50"
            )
        )
    }

    @Test
    fun `changePassword - contains username`() {
        val newPassword = "123${testUserEntity.username}123"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword("12345", newPassword)
        }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")
        assertThat(exception.validationDetails).hasSameElementsAs(
            listOf(
                "Der Benutzername darf nicht Teil des Passworts sein"
            )
        )
    }

    @Test
    fun `changePassword - contains whitespace`() {
        val newPassword = "1234 1234"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword("12345", newPassword)
        }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")
        assertThat(exception.validationDetails).hasSameElementsAs(
            listOf(
                "Leerzeichen sind nicht erlaubt"
            )
        )
    }

    @Test
    fun `changePassword - contains illegal words`() {
        val newPassword = "123wrk123tafel123"

        val exception = assertThrows<PasswordChangeException> {
            manager.changePassword("12345", newPassword)
        }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")
        assertThat(exception.validationDetails).hasSameElementsAs(
            listOf(
                "Folgende Wörter dürfen nicht enhalten sein: wrk"
            )
        )
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

    @Test
    fun `loadUserById - user not found`() {
        every { userRepository.findById(any()) } returns Optional.empty()

        assertThrows<UsernameNotFoundException> {
            manager.loadUserById(1)
        }

        verify(exactly = 1) {
            userRepository.findById(1)
        }
    }

    @Test
    fun `loadUserById - user found and mapped`() {
        val userEntity = UserEntity()
        userEntity.username = "test-username"
        userEntity.password = "test-password"
        userEntity.enabled = true
        userEntity.id = 0
        userEntity.personnelNumber = "test-personnelnumber"
        userEntity.firstname = "test-firstname"
        userEntity.lastname = "test-lastname"
        userEntity.passwordChangeRequired = true

        every { userRepository.findById(any()) } returns Optional.of(userEntity)

        val userDetails = manager.loadUserById(userEntity.id!!) as TafelUser

        assertThat(userDetails).isNotNull
        assertThat(userDetails.id).isEqualTo(userEntity.id)
        assertThat(userDetails.username).isEqualTo(userEntity.username)
        assertThat(userDetails.personnelNumber).isEqualTo(userEntity.personnelNumber)
        assertThat(userDetails.firstname).isEqualTo(userEntity.firstname)
        assertThat(userDetails.lastname).isEqualTo(userEntity.lastname)

        verify(exactly = 1) {
            userRepository.findById(userEntity.id!!)
        }
    }

    @Test
    fun `loadUserByPersonnelNumber - user not found`() {
        every { userRepository.findByPersonnelNumber(any()) } returns Optional.empty()

        assertThrows<UsernameNotFoundException> {
            manager.loadUserByPersonnelNumber("1")
        }

        verify(exactly = 1) {
            userRepository.findByPersonnelNumber("1")
        }
    }

    @Test
    fun `loadUserByPersonnelNumber - user found and mapped`() {
        val userEntity = UserEntity()
        userEntity.username = "test-username"
        userEntity.password = "test-password"
        userEntity.enabled = true
        userEntity.id = 0
        userEntity.personnelNumber = "test-personnelnumber"
        userEntity.firstname = "test-firstname"
        userEntity.lastname = "test-lastname"
        userEntity.passwordChangeRequired = true

        every { userRepository.findByPersonnelNumber(any()) } returns Optional.of(userEntity)

        val userDetails = manager.loadUserByPersonnelNumber(userEntity.personnelNumber!!) as TafelUser

        assertThat(userDetails).isNotNull
        assertThat(userDetails.id).isEqualTo(userEntity.id)
        assertThat(userDetails.username).isEqualTo(userEntity.username)
        assertThat(userDetails.personnelNumber).isEqualTo(userEntity.personnelNumber)
        assertThat(userDetails.firstname).isEqualTo(userEntity.firstname)
        assertThat(userDetails.lastname).isEqualTo(userEntity.lastname)

        verify(exactly = 1) {
            userRepository.findByPersonnelNumber(userEntity.personnelNumber!!)
        }
    }

}

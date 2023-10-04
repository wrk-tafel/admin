package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.PasswordChangeException
import at.wrk.tafel.admin.backend.common.auth.components.TafelUserDetailsManager
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.WebSecurityConfig
import at.wrk.tafel.admin.backend.database.entities.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.passay.PasswordData
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
        every { userRepository.findByUsername(testUser.username) } returns testUserEntity
        testUserEntityPassword = testUserEntity.password!!
    }

    @AfterEach
    fun afterEach() {
        testUserEntity.password = testUserEntityPassword
    }

    @Test
    fun `loadUserByUsername - user not found`() {
        every { userRepository.findByUsername(any()) } returns null

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

        every { userRepository.findByUsername(any()) } returns userEntity

        val userDetails = manager.loadUserByUsername("test")

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

        val user = manager.loadUserById(1)

        assertThat(user).isNull()
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
        every { userRepository.findByPersonnelNumber(any()) } returns null

        val user = manager.loadUserByPersonnelNumber("1")

        assertThat(user).isNull()
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

        every { userRepository.findByPersonnelNumber(any()) } returns userEntity

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

    @Test
    fun `loadUsers with firstname and lastname found and mapped properly`() {
        val firstname = "test-firstname"
        val lastname = "test-lastname"

        val userEntity = UserEntity()
        userEntity.username = "test-username"
        userEntity.password = "test-password"
        userEntity.enabled = true
        userEntity.id = 0
        userEntity.personnelNumber = "test-personnelnumber"
        userEntity.firstname = "test-firstname"
        userEntity.lastname = "test-lastname"
        userEntity.passwordChangeRequired = true

        every {
            userRepository.findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(firstname, lastname)
        } returns listOf(userEntity)

        val userDetails = manager.loadUsers(firstname = firstname, lastname = lastname)

        assertThat(userDetails).isNotNull

        val user = userDetails.first()
        assertThat(user.id).isEqualTo(userEntity.id)
        assertThat(user.username).isEqualTo(userEntity.username)
        assertThat(user.personnelNumber).isEqualTo(userEntity.personnelNumber)
        assertThat(user.firstname).isEqualTo(userEntity.firstname)
        assertThat(user.lastname).isEqualTo(userEntity.lastname)

        verify(exactly = 1) {
            userRepository.findAllByFirstnameContainingIgnoreCaseOrLastnameContainingIgnoreCase(firstname, lastname)
        }
    }

    @Test
    fun `loadUsers with firstname only`() {
        val firstname = "test-firstname"
        every { userRepository.findAllByFirstnameContainingIgnoreCase(any()) } returns emptyList()

        manager.loadUsers(firstname = firstname, lastname = null)

        verify(exactly = 1) {
            userRepository.findAllByFirstnameContainingIgnoreCase(firstname)
        }
    }

    @Test
    fun `loadUsers with lastname only`() {
        val lastname = "test-lastname"
        every { userRepository.findAllByLastnameContainingIgnoreCase(any()) } returns emptyList()

        manager.loadUsers(firstname = null, lastname = lastname)

        verify(exactly = 1) {
            userRepository.findAllByLastnameContainingIgnoreCase(lastname)
        }
    }

    @Test
    fun `updateUser mapped properly`() {
        val testUserEntity = UserEntity().apply {
            id = 0
            username = "test-username"
            // pwd: 12345
            password =
                "{argon2}\$argon2id\$v=19\$m=4096,t=3,p=1\$RXn6Xt/0q/Wtrvdns6NUnw\$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w"
            enabled = true
            personnelNumber = "test-personnelnumber"
            firstname = "test-firstname"
            lastname = "test-lastname"
            authorities = testUserPermissions.map {
                val entity = UserAuthorityEntity()
                entity.user = this
                entity.name = it.key
                entity
            }.toMutableList()
            passwordChangeRequired = false
            authorities = mutableListOf(
                UserAuthorityEntity().apply {
                    user = testUserEntity
                    name = UserPermissions.CHECKIN.key
                },
                UserAuthorityEntity().apply {
                    user = testUserEntity
                    name = UserPermissions.DISTRIBUTION_LCM.key
                }
            )
        }

        every { userRepository.findById(testUser.id) } returns Optional.of(testUserEntity)
        every { userRepository.save(any()) } returns mockk(relaxed = true)

        val userUpdate = testUser.copy(
            personnelNumber = "new-persnr",
            username = "new-username",
            firstname = "new-firstname",
            lastname = "new-lastname",
            enabled = false,
            passwordChangeRequired = true,
            authorities = listOf(
                SimpleGrantedAuthority(UserPermissions.CHECKIN.key)
            )
        )
        manager.updateUser(userUpdate)

        val updatedUserSlot = slot<UserEntity>()
        verify(exactly = 1) {
            userRepository.save(capture<UserEntity>(updatedUserSlot))
        }

        val updatedUser = updatedUserSlot.captured
        assertThat(updatedUser.id).isEqualTo(userUpdate.id)
        assertThat(updatedUser.personnelNumber).isEqualTo(userUpdate.personnelNumber)
        assertThat(updatedUser.username).isEqualTo(userUpdate.username)
        assertThat(updatedUser.firstname).isEqualTo(userUpdate.firstname)
        assertThat(updatedUser.lastname).isEqualTo(userUpdate.lastname)
        assertThat(updatedUser.enabled).isEqualTo(userUpdate.enabled)
        assertThat(updatedUser.passwordChangeRequired).isEqualTo(userUpdate.passwordChangeRequired)
        assertThat(updatedUser.authorities).hasSize(1)
        assertThat(updatedUser.authorities.first().name).isEqualTo(UserPermissions.CHECKIN.key)
    }

    @Test
    fun `updateUser including password change successful`() {
        val testUserEntity = UserEntity().apply {
            id = 0
            username = "test-username"
            // pwd: 12345
            password =
                "{argon2}\$argon2id\$v=19\$m=4096,t=3,p=1\$RXn6Xt/0q/Wtrvdns6NUnw\$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w"
            enabled = true
            personnelNumber = "test-personnelnumber"
            firstname = "test-firstname"
            lastname = "test-lastname"
            authorities = testUserPermissions.map {
                val entity = UserAuthorityEntity()
                entity.user = this
                entity.name = it.key
                entity
            }.toMutableList()
            passwordChangeRequired = false
        }

        every { userRepository.findById(testUser.id) } returns Optional.of(testUserEntity)
        every { userRepository.save(any()) } returns mockk(relaxed = true)

        val encodedPassword = "dummy-encoded-pwd"
        every { passwordEncoder.encode(any()) } returns encodedPassword

        val newPassword = "new-pwd1234"
        val userUpdate = testUser.copy(
            personnelNumber = "new-persnr",
            username = "new-username",
            firstname = "new-firstname",
            lastname = "new-lastname",
            enabled = false,
            password = newPassword,
            passwordChangeRequired = true
        )
        manager.updateUser(userUpdate)

        val updatedUserSlot = slot<UserEntity>()
        verify(exactly = 1) {
            userRepository.save(capture<UserEntity>(updatedUserSlot))
        }
        verify(exactly = 1) { passwordEncoder.encode(newPassword) }

        val passwordValidationDataSlot = slot<PasswordData>()
        verify(exactly = 1) { passwordValidator.validate(capture(passwordValidationDataSlot)) }
        assertThat(passwordValidationDataSlot.captured.username).isEqualTo(userUpdate.username)
        assertThat(passwordValidationDataSlot.captured.password).isEqualTo(newPassword)

        val updatedUser = updatedUserSlot.captured
        assertThat(updatedUser.password).isEqualTo(encodedPassword)
        assertThat(updatedUser.passwordChangeRequired).isEqualTo(userUpdate.passwordChangeRequired)
    }

    @Test
    fun `updateUser including password change failed`() {
        val testUserEntity = UserEntity().apply {
            id = 0
            username = "test-username"
            // pwd: 12345
            password =
                "{argon2}\$argon2id\$v=19\$m=4096,t=3,p=1\$RXn6Xt/0q/Wtrvdns6NUnw\$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w"
            enabled = true
            personnelNumber = "test-personnelnumber"
            firstname = "test-firstname"
            lastname = "test-lastname"
            authorities = testUserPermissions.map {
                val entity = UserAuthorityEntity()
                entity.user = this
                entity.name = it.key
                entity
            }.toMutableList()
            passwordChangeRequired = false
        }

        every { userRepository.findById(testUser.id) } returns Optional.of(testUserEntity)
        every { userRepository.save(any()) } returns mockk(relaxed = true)
        every { passwordValidator.validate(any()) } returns RuleResult(false)

        val newPassword = "new-pwd1234"
        val userUpdate = testUser.copy(
            personnelNumber = "new-persnr",
            username = "new-username",
            firstname = "new-firstname",
            lastname = "new-lastname",
            enabled = false,
            password = newPassword,
            passwordChangeRequired = true
        )

        val exception = assertThrows<PasswordChangeException> { manager.updateUser(userUpdate) }
        assertThat(exception.message).isEqualTo("Das neue Passwort ist ungültig!")

        verify(exactly = 0) { userRepository.save(any()) }
        verify(exactly = 0) { passwordEncoder.encode(newPassword) }

        val passwordValidationDataSlot = slot<PasswordData>()
        verify(exactly = 1) { passwordValidator.validate(capture(passwordValidationDataSlot)) }
        assertThat(passwordValidationDataSlot.captured.username).isEqualTo(userUpdate.username)
        assertThat(passwordValidationDataSlot.captured.password).isEqualTo(newPassword)
    }

    @Test
    fun `deleteUser not found`() {
        every { userRepository.findByUsername(any()) } returns null

        val exception = assertThrows<UsernameNotFoundException> { manager.deleteUser("username") }

        assertThat(exception.message).isEqualTo("Username not found")
    }

    @Test
    fun `deleteUser found`() {
        every { userRepository.findByUsername(any()) } returns testUserEntity

        manager.deleteUser(testUserEntity.username!!)

        verify { userRepository.delete(testUserEntity) }
    }

}

package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import at.wrk.tafel.admin.backend.config.properties.SecuritySessionProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.DisabledException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@ExtendWith(MockKExtension::class)
internal class TafelSessionAuthProviderTest {

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    private val properties = TafelAdminProperties()

    private val now = Instant.parse("2026-10-17T08:00:00Z")
    private val clock = Clock.fixed(now, ZoneOffset.UTC)

    private val applicationProperties = ApplicationProperties(
        security = SecurityProperties(session = SecuritySessionProperties(lifetimeInSeconds = 36000, pendingLifetimeInSeconds = 300)),
    )

    private lateinit var provider: TafelSessionAuthProvider

    @BeforeEach
    fun createProvider() {
        provider = TafelSessionAuthProvider(userRepository, properties, applicationProperties, clock)
    }

    @Test
    fun `supports with wrong class results in false`() {
        val result = provider.supports(Exception::class.java)

        assertThat(result).isFalse
    }

    @Test
    fun `supports with correct class results in true`() {
        val result = provider.supports(TafelAuthentication::class.java)

        assertThat(result).isTrue
    }

    @Test
    fun `authenticate successful reads permissions from the DB, not the session`() {
        val userEntity = user()
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = "PERM1"))

        val resultingAuthentication = provider.authenticate(session())

        assertThat(resultingAuthentication.isAuthenticated).isTrue
        assertThat(resultingAuthentication.name).isEqualTo("SUBJ")
        assertThat(resultingAuthentication.sessionKey).isEqualTo("KEY")
        assertThat(resultingAuthentication.authorities.joinToString(",")).isEqualTo("PERM1")
        // AuditActorProvider.currentUserId() reads this instead of looking the user up again -
        // see TafelAuthenticationModel.kt's KDoc on userId for why.
        assertThat(resultingAuthentication.userId).isEqualTo(42)
    }

    /**
     * ADMINISTRATOR grants everything, so authenticating as one is expanded into every permission -
     * every `@PreAuthorize`, the frontend's route guards and its `tafelIfPermission` directive all
     * read what lands on the resulting authentication.
     */
    @Test
    fun `authenticate expands the administrator permission into every permission`() {
        val userEntity = user()
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = UserPermissions.ADMINISTRATOR.key))

        val resultingAuthentication = provider.authenticate(session())

        assertThat(resultingAuthentication.authorities.mapNotNull { it.authority })
            .containsExactlyInAnyOrderElementsOf(UserPermissions.entries.map { it.key })
    }

    @Test
    fun `authenticate grants no permissions while a password change is still required`() {
        val userEntity = user(passwordChangeRequired = true)
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = UserPermissions.ADMINISTRATOR.key))

        val resultingAuthentication = provider.authenticate(session(createdSecondsAgo = 60))

        assertThat(resultingAuthentication.authorities).isEmpty()
    }

    @Test
    fun `authenticate grants no permissions to a session that has not passed the second factor the user has switched on`() {
        user(mfaEnabled = true)

        val result = provider.authenticate(session(createdSecondsAgo = 60))

        assertThat(result.authorities).isEmpty()
        assertThat(result.mfaPending).isTrue()
        assertThat(result.mfaVerified).isFalse()
        assertThat(result.isAuthenticated).isTrue()
    }

    @Test
    fun `authenticate grants the permissions to a session that has passed the second factor`() {
        user(mfaEnabled = true)

        val result = provider.authenticate(session(mfaVerified = true))

        assertThat(result.authorities.map { it.authority }).containsExactly(UserPermissions.CHECKIN.key)
        assertThat(result.mfaPending).isFalse()
        assertThat(result.mfaVerified).isTrue()
    }

    @Test
    fun `authenticate does not ask a user without a second factor for one`() {
        user()

        val result = provider.authenticate(session())

        assertThat(result.authorities.map { it.authority }).containsExactly(UserPermissions.CHECKIN.key)
        assertThat(result.mfaPending).isFalse()
    }

    @Test
    fun `authenticate treats the e-mail method like the app - a session that has not passed it grants nothing`() {
        user(emailEnabled = true)

        val result = provider.authenticate(session(createdSecondsAgo = 60))

        assertThat(result.authorities).isEmpty()
        assertThat(result.mfaPending).isTrue()
        assertThat(result.mfaMethods).containsExactly("EMAIL")
    }

    @Test
    fun `authenticate lists the methods a user has`() {
        user(mfaEnabled = true, emailEnabled = true)

        assertThat(provider.authenticate(session(createdSecondsAgo = 60)).mfaMethods).containsExactly("TOTP", "EMAIL")
    }

    // The deployment can require every user to have a second factor.
    @Test
    fun `authenticate grants nothing to a user with no method while the deployment requires one`() {
        properties.mfa.required = true
        user()

        val result = provider.authenticate(session())

        assertThat(result.authorities).isEmpty()
        assertThat(result.mfaSetupRequired).isTrue()
        assertThat(result.mfaPending).isFalse()
    }

    @Test
    fun `authenticate does not ask a user who has a method and an address to set one up, and asks nobody while it is not required`() {
        properties.mfa.required = true
        user(mfaEnabled = true, email = "user@example.org")
        assertThat(provider.authenticate(session(mfaVerified = true)).mfaSetupRequired).isFalse()

        properties.mfa.required = false
        user()
        assertThat(provider.authenticate(session(mfaVerified = true)).mfaSetupRequired).isFalse()
    }

    // ADR-0062: the address itself is mandatory while the deployment requires a second factor, not just a
    // prerequisite for choosing the e-mail method - a user whose only method is the app still owes one.
    @Test
    fun `authenticate asks a user who has a method but no address to add one, while it is required`() {
        properties.mfa.required = true
        user(mfaEnabled = true, email = null)

        val result = provider.authenticate(session(mfaVerified = true))

        assertThat(result.authorities).isEmpty()
        assertThat(result.mfaSetupRequired).isTrue()
    }

    @Test
    fun `authenticate does not ask a user with no method for an address while it is not required`() {
        properties.mfa.required = false
        user(email = null)

        assertThat(provider.authenticate(session()).mfaSetupRequired).isFalse()
    }

    @Test
    fun `authenticate rejects a session older than its lifetime`() {
        user()

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(session(createdSecondsAgo = 36000))
        }
    }

    @Test
    fun `authenticate accepts a finished session right up to the end of its lifetime`() {
        user()

        assertThat(provider.authenticate(session(createdSecondsAgo = 35999)).isAuthenticated).isTrue()
    }

    @Test
    fun `authenticate gives a session that still owes its second factor only the pending lifetime`() {
        user(mfaEnabled = true)

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(session(createdSecondsAgo = 300))
        }
    }

    @Test
    fun `authenticate gives a session that still owes a password change only the pending lifetime`() {
        user(passwordChangeRequired = true)

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(session(createdSecondsAgo = 301))
        }
    }

    @Test
    fun `authenticate rejects a session that does not say when it began`() {
        user()

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(TafelAuthentication(sessionKey = "KEY", username = "SUBJ"))
        }
    }

    @Test
    fun `authenticate with a disabled user fails`() {
        user(enabled = false)

        assertThrows<DisabledException> {
            provider.authenticate(session())
        }
    }

    @Test
    fun `authenticate with a deleted or renamed user fails`() {
        every { userRepository.findByUsername("SUBJ") } returns null

        assertThrows<DisabledException> {
            provider.authenticate(session())
        }
    }

    private fun session(mfaVerified: Boolean = false, createdSecondsAgo: Long = 3600) = TafelAuthentication(
        sessionKey = "KEY",
        username = "SUBJ",
        mfaVerified = mfaVerified,
        sessionCreatedAt = now.minusSeconds(createdSecondsAgo),
    )

    private fun user(
        mfaEnabled: Boolean = false,
        emailEnabled: Boolean = false,
        email: String? = null,
        enabled: Boolean = true,
        passwordChangeRequired: Boolean = false,
    ): UserEntity {
        val userEntity = UserEntity(
            username = "SUBJ",
            password = "pwd",
            personnelNumber = "1",
            firstname = "test",
            lastname = "test",
            enabled = enabled,
            passwordChangeRequired = passwordChangeRequired,
        )
        userEntity.id = 42
        userEntity.mfaTotpEnabled = mfaEnabled
        userEntity.mfaEmailEnabled = emailEnabled
        userEntity.email = email
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = UserPermissions.CHECKIN.key))
        every { userRepository.findByUsername("SUBJ") } returns userEntity
        return userEntity
    }
}

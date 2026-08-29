package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.LockedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.authentication.WebAuthenticationDetails

internal class TafelLoginProviderTest {

    private lateinit var userDetailsService: UserDetailsService
    private lateinit var passwordEncoder: PasswordEncoder
    private lateinit var loginAttemptService: LoginAttemptService
    private lateinit var loginAttemptIpService: LoginAttemptIpService
    private lateinit var loginAuditService: LoginAuditService
    private lateinit var upgradedHashes: MutableList<Pair<String, String>>
    private lateinit var provider: TafelLoginProvider

    private val testUser = TafelUser(
        id = 1,
        username = "user",
        password = "encoded-password",
        enabled = true,
        personnelNumber = "0001",
        firstname = "First",
        lastname = "Last",
        authorities = emptyList(),
        passwordChangeRequired = false,
    )

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    @BeforeEach
    fun setUp() {
        userDetailsService = mockk()
        passwordEncoder = mockk()
        loginAttemptService = mockk(relaxed = true)
        loginAttemptIpService = mockk(relaxed = true)
        loginAuditService = mockk(relaxed = true)

        every { passwordEncoder.encode(any()) } returns "fallback-hash"
        every { passwordEncoder.upgradeEncoding(any()) } returns false
        upgradedHashes = mutableListOf()
        provider = TafelLoginProvider(userDetailsService, passwordEncoder, loginAttemptService, loginAttemptIpService, loginAuditService) { username, upgradedHash ->
            upgradedHashes.add(username to upgradedHash)
        }

        logger = LoggerFactory.getLogger(TafelLoginProvider::class.java) as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
    }

    @AfterEach
    fun tearDown() {
        logger.detachAppender(logAppender)
    }

    @Test
    fun `supports UsernamePasswordAuthenticationToken`() {
        assertThat(provider.supports(UsernamePasswordAuthenticationToken::class.java)).isTrue
    }

    @Test
    fun `doesnt support other authentication classes`() {
        assertThat(provider.supports(TafelJwtAuthentication::class.java)).isFalse
    }

    @Test
    fun `disabled user is rejected`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser.copy(enabled = false)
        every { passwordEncoder.matches("pwd", "encoded-password") } returns true

        assertThrows<DisabledException> {
            provider.authenticate(UsernamePasswordAuthenticationToken("user", "pwd"))
        }
    }

    @Test
    fun `successful login resets the failure counter`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("pwd", "encoded-password") } returns true

        val result = provider.authenticate(UsernamePasswordAuthenticationToken("user", "pwd"))

        assertThat(result.isAuthenticated).isTrue
        verify { loginAttemptService.recordSuccess("user") }
        verify { loginAuditService.recordLogin(testUser) }
        assertThat(logAppender.list.single().level).isEqualTo(Level.INFO)
        assertThat(logAppender.list.single().formattedMessage).contains("user")
        assertThat(upgradedHashes).isEmpty()
    }

    @Test
    fun `successful login with a hash from older argon2 parameters upgrades it`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("pwd", "encoded-password") } returns true
        every { passwordEncoder.upgradeEncoding("encoded-password") } returns true
        every { passwordEncoder.encode("pwd") } returns "re-encoded-password"

        val result = provider.authenticate(UsernamePasswordAuthenticationToken("user", "pwd"))

        assertThat(result.isAuthenticated).isTrue
        assertThat(upgradedHashes).containsExactly("user" to "re-encoded-password")
    }

    @Test
    fun `unauthenticated login attempt doesnt trigger an upgrade`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("wrong-pwd", "encoded-password") } returns false

        assertThrows<BadCredentialsException> {
            provider.authenticate(UsernamePasswordAuthenticationToken("user", "wrong-pwd"))
        }

        verify(exactly = 0) { passwordEncoder.upgradeEncoding(any()) }
        assertThat(upgradedHashes).isEmpty()
    }

    @Test
    fun `locked user is rejected without hitting the user store`() {
        every { loginAttemptService.isLocked("user") } returns true

        assertThrows<LockedException> {
            provider.authenticate(UsernamePasswordAuthenticationToken("user", "pwd"))
        }

        verify(exactly = 0) { userDetailsService.loadUserByUsername(any()) }
        verify(exactly = 0) { loginAttemptService.recordFailure(any()) }
        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(logAppender.list.single().formattedMessage).contains("user")
    }

    @Test
    fun `wrong password records a failure`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("wrong-pwd", "encoded-password") } returns false

        assertThrows<BadCredentialsException> {
            provider.authenticate(UsernamePasswordAuthenticationToken("user", "wrong-pwd"))
        }

        verify { loginAttemptService.recordFailure("user") }
        verify(exactly = 0) { loginAuditService.recordLogin(any()) }
        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(logAppender.list.single().formattedMessage).contains("user")
    }

    @Test
    fun `login from a locked-out IP is rejected without hitting the user store`() {
        every { loginAttemptIpService.isLocked("1.2.3.4") } returns true
        val authRequest = UsernamePasswordAuthenticationToken("user", "pwd")
        authRequest.details = WebAuthenticationDetails("1.2.3.4", null)

        assertThrows<LockedException> {
            provider.authenticate(authRequest)
        }

        verify(exactly = 0) { userDetailsService.loadUserByUsername(any()) }
        verify(exactly = 0) { loginAttemptService.isLocked(any()) }
        verify(exactly = 0) { loginAttemptIpService.recordFailure(any()) }
    }

    @Test
    fun `successful login from a known IP resets its failure counter too`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { loginAttemptIpService.isLocked("1.2.3.4") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("pwd", "encoded-password") } returns true
        val authRequest = UsernamePasswordAuthenticationToken("user", "pwd")
        authRequest.details = WebAuthenticationDetails("1.2.3.4", null)

        provider.authenticate(authRequest)

        verify { loginAttemptIpService.recordSuccess("1.2.3.4") }
    }

    @Test
    fun `wrong password from a known IP records an IP failure too`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { loginAttemptIpService.isLocked("1.2.3.4") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("wrong-pwd", "encoded-password") } returns false
        val authRequest = UsernamePasswordAuthenticationToken("user", "wrong-pwd")
        authRequest.details = WebAuthenticationDetails("1.2.3.4", null)

        assertThrows<BadCredentialsException> {
            provider.authenticate(authRequest)
        }

        verify { loginAttemptIpService.recordFailure("1.2.3.4") }
    }

    @Test
    fun `authentication built without request details skips IP tracking entirely`() {
        every { loginAttemptService.isLocked("user") } returns false
        every { userDetailsService.loadUserByUsername("user") } returns testUser
        every { passwordEncoder.matches("pwd", "encoded-password") } returns true

        provider.authenticate(UsernamePasswordAuthenticationToken("user", "pwd"))

        verify(exactly = 0) { loginAttemptIpService.isLocked(any()) }
        verify(exactly = 0) { loginAttemptIpService.recordSuccess(any()) }
        verify(exactly = 0) { loginAttemptIpService.recordFailure(any()) }
    }

    @Test
    fun `unknown user records a failure and runs the fallback hash comparison`() {
        every { loginAttemptService.isLocked("unknown") } returns false
        every { userDetailsService.loadUserByUsername("unknown") } throws UsernameNotFoundException("not found")
        every { passwordEncoder.matches(any(), "fallback-hash") } returns false

        // UsernameNotFoundException is hidden as BadCredentialsException to avoid enumeration
        assertThrows<BadCredentialsException> {
            provider.authenticate(UsernamePasswordAuthenticationToken("unknown", "pwd"))
        }

        verify { passwordEncoder.matches("pwd", "fallback-hash") }
        verify { loginAttemptService.recordFailure("unknown") }
    }
}

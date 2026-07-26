package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.TafelUser
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.LockedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder

internal class TafelLoginProviderTest {

    private lateinit var userDetailsService: UserDetailsService
    private lateinit var passwordEncoder: PasswordEncoder
    private lateinit var loginAttemptService: LoginAttemptService
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
        passwordChangeRequired = false
    )

    @BeforeEach
    fun setUp() {
        userDetailsService = mockk()
        passwordEncoder = mockk()
        loginAttemptService = mockk(relaxed = true)

        every { passwordEncoder.encode(any()) } returns "fallback-hash"
        provider = TafelLoginProvider(userDetailsService, passwordEncoder, loginAttemptService)
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
    }

    @Test
    fun `locked user is rejected without hitting the user store`() {
        every { loginAttemptService.isLocked("user") } returns true

        assertThrows<LockedException> {
            provider.authenticate(UsernamePasswordAuthenticationToken("user", "pwd"))
        }

        verify(exactly = 0) { userDetailsService.loadUserByUsername(any()) }
        verify(exactly = 0) { loginAttemptService.recordFailure(any()) }
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

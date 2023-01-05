package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginProvider
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.*

@ExtendWith(MockKExtension::class)
class TafelLoginProviderTest {

    @RelaxedMockK
    private lateinit var userDetailsService: UserDetailsService

    @RelaxedMockK
    private lateinit var passwordEncoder: PasswordEncoder

    @InjectMockKs
    private lateinit var tafelLoginProvider: TafelLoginProvider

    @Test
    fun `supports - JwtAuthenticationToken class given`() {
        assertThat(tafelLoginProvider.supports(UsernamePasswordAuthenticationToken::class.java)).isTrue
    }

    @Test
    fun `supports - different class given`() {
        assertThat(tafelLoginProvider.supports(TafelJwtAuthentication::class.java)).isFalse
    }

    @Test
    fun `retrieveUser - ordinary case`() {
        val user = User("username", "password", emptyList())
        every { userDetailsService.loadUserByUsername(any()) } returns user

        val authentication = UsernamePasswordAuthenticationToken(user.username, user.password)

        every { passwordEncoder.matches(any(), any()) } returns true

        tafelLoginProvider.authenticate(authentication)

        verify(exactly = 1) {
            userDetailsService.loadUserByUsername(user.username)
        }
    }

    @Test
    fun `additionalAuthenticationChecks - user disabled`() {
        val user = User("username", "password", false, true, true, true, emptyList())
        every { userDetailsService.loadUserByUsername(any()) } returns user

        val authentication = UsernamePasswordAuthenticationToken(user.username, user.password)

        assertThrows<DisabledException> {
            tafelLoginProvider.authenticate(authentication)
        }
    }

    @Test
    fun `additionalAuthenticationChecks - password invalid`() {
        val user = User("username", "password", true, true, true, true, emptyList())
        every { userDetailsService.loadUserByUsername(any()) } returns user

        val authentication = UsernamePasswordAuthenticationToken(user.username, user.password)

        every { passwordEncoder.matches(any(), any()) } returns false

        assertThrows<BadCredentialsException> {
            tafelLoginProvider.authenticate(authentication)
        }
    }

}

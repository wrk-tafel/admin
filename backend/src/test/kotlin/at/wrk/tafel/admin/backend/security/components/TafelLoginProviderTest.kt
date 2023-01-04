package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.TafelLoginProvider
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.model.JwtAuthenticationToken
import io.jsonwebtoken.impl.DefaultClaims
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.InsufficientAuthenticationException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

@ExtendWith(MockKExtension::class)
class TafelLoginProviderTest {

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    @RelaxedMockK
    private lateinit var userDetailsService: UserDetailsService

    @InjectMockKs
    private lateinit var tafelLoginProvider: TafelLoginProvider

    @Test
    fun `supports - JwtAuthenticationToken class given`() {
        assertThat(tafelLoginProvider.supports(JwtAuthenticationToken::class.java)).isTrue
    }

    @Test
    fun `supports - different class given`() {
        assertThat(tafelLoginProvider.supports(UsernamePasswordAuthenticationToken::class.java)).isFalse
    }

    @Test
    fun `retrieveUser - normal case`() {
        val claims = DefaultClaims()
        claims.expiration = Date.from(Instant.now().plus(1, ChronoUnit.HOURS))
        claims.subject = "subj"

        every { jwtTokenService.getClaimsFromToken(any()) } returns claims

        val user = User("username", "password", emptyList())
        every { userDetailsService.loadUserByUsername(any()) } returns user

        val authentication = JwtAuthenticationToken("TOKEN")

        tafelLoginProvider.authenticate(authentication)

        verify(exactly = 1) {
            userDetailsService.loadUserByUsername("subj")
        }
    }

    @Test
    fun `retrieveUser - expired token`() {
        val claims = DefaultClaims()
        claims.expiration = Date.from(Instant.now().minus(1, ChronoUnit.HOURS))
        claims.subject = "subj"

        every { jwtTokenService.getClaimsFromToken(any()) } returns claims

        val user = User("username", "password", emptyList())
        every { userDetailsService.loadUserByUsername(any()) } returns user

        val authentication = JwtAuthenticationToken("TOKEN")

        assertThrows<InsufficientAuthenticationException> {
            tafelLoginProvider.authenticate(authentication)
        }
    }

    @Test
    fun `additionalAuthenticationChecks - user disabled`() {
        val claims = DefaultClaims()
        claims.expiration = Date.from(Instant.now().plus(1, ChronoUnit.HOURS))
        claims.subject = "subj"

        every { jwtTokenService.getClaimsFromToken(any()) } returns claims

        val user = User("username", "password", false, true, true, true, emptyList())
        every { userDetailsService.loadUserByUsername(any()) } returns user

        val authentication = JwtAuthenticationToken("TOKEN")

        assertThrows<DisabledException> {
            tafelLoginProvider.authenticate(authentication)
        }
    }
}

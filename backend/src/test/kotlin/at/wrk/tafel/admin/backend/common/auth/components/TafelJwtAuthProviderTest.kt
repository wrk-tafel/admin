package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService.Companion.CLAIM_KEY_FULLNAME
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.jsonwebtoken.Claims
import io.jsonwebtoken.MalformedJwtException
import io.jsonwebtoken.impl.DefaultClaims
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.CredentialsExpiredException
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.*

@ExtendWith(MockKExtension::class)
internal class TafelJwtAuthProviderTest {

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    @InjectMockKs
    private lateinit var provider: TafelJwtAuthProvider

    @Test
    fun `supports with wrong class results in false`() {
        val result = provider.supports(Exception::class.java)

        assertThat(result).isFalse
    }

    @Test
    fun `supports with correct class results in true`() {
        val result = provider.supports(TafelJwtAuthentication::class.java)

        assertThat(result).isTrue
    }

    @Test
    fun `authenticate successful`() {
        val username = "SUBJ"
        val fullName = "FULL_NAME"
        val tokenValue = "TOKEN"
        val perm1 = "PERM1"
        val expiration = Date.from(LocalDateTime.now().plusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = tokenValue)
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                CLAIM_KEY_FULLNAME to fullName,
                Claims.EXPIRATION to expiration,
                JwtTokenService.CLAIM_KEY_PERMISSIONS to listOf(perm1)
            )
        )

        val resultingAuthentication = provider.authenticate(authentication)

        assertThat(resultingAuthentication).isNotNull
        assertThat(resultingAuthentication.isAuthenticated).isTrue
        assertThat(resultingAuthentication.name).isEqualTo(username)
        assertThat(resultingAuthentication.fullName).isEqualTo(fullName)
        assertThat(resultingAuthentication.authorities.joinToString(",")).isEqualTo(perm1)
    }

    @Test
    fun `authenticate with expired token fails`() {
        val username = "SUBJ"
        val tokenValue = "TOKEN"
        val perm1 = "PERM1"
        val expiration = Date.from(LocalDateTime.now().minusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = tokenValue)
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
                JwtTokenService.CLAIM_KEY_PERMISSIONS to listOf(perm1)
            )
        )

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(authentication)
        }
    }

    @Test
    fun `authenticate with invalid token fails`() {
        val tokenValue = "TOKEN"

        val authentication = TafelJwtAuthentication(tokenValue = tokenValue)
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } throws MalformedJwtException("exception")

        assertThrows<BadCredentialsException> {
            provider.authenticate(authentication)
        }
    }

}

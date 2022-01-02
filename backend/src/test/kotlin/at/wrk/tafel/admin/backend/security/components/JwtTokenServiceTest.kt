package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.config.ApplicationProperties
import at.wrk.tafel.admin.backend.config.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.SecurityProperties
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.SignatureException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*
import javax.crypto.spec.SecretKeySpec

class JwtTokenServiceTest {

    private lateinit var properties: ApplicationProperties
    private lateinit var jwtTokenService: JwtTokenService

    @BeforeEach
    fun beforeEach() {
        properties = ApplicationProperties(
            security = SecurityProperties(
                jwtToken = SecurityJwtTokenProperties(
                    secret = SecurityJwtTokenSecretProperties(
                        value = "test-dummy".padEnd(50, 'A'),
                        algorithm = "HmacSHA512"
                    ),
                    expirationTimeInSeconds = 5000
                )
            )
        )
        jwtTokenService = JwtTokenService(properties)
    }

    @Test
    fun `getClaimsFromToken - valid token generated and parsed`() {
        val token = jwtTokenService.generateToken(
            "test-user", listOf(
                SimpleGrantedAuthority("dummy-role")
            )
        )

        val claims = jwtTokenService.getClaimsFromToken(token)

        assertThat(claims["roles"] as List<*>).contains("dummy-role")
    }

    @Test
    fun `getClaimsFromToken - invalid token denied`() {
        val token = generateToken(secretKey = "wrongkey".padEnd(50, 'A'))

        assertThrows<SignatureException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    private fun generateToken(secretKey: String? = null): String {
        val tokenProperties = properties.security.jwtToken

        val secretKeySpec =
            SecretKeySpec((secretKey ?: tokenProperties.secret.value).toByteArray(), tokenProperties.secret.algorithm)
        val expirationDate = Date.from(Instant.now().plus(1, ChronoUnit.HOURS))

        return Jwts.builder()
            .setSubject("dummy-subject")
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(expirationDate)
            .signWith(secretKeySpec)
            .compact()
    }

}

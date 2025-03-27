package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService.Companion.CLAIM_KEY_FULLNAME
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService.Companion.CLAIM_KEY_PERMISSIONS
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityJwtTokenSecretProperties
import at.wrk.tafel.admin.backend.config.properties.SecurityProperties
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.IncorrectClaimException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.MissingClaimException
import io.jsonwebtoken.security.SignatureException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.time.LocalDateTime
import java.time.ZoneId
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
                    issuer = "issuer",
                    audience = "audience",
                    expirationTimeInSeconds = 5000,
                    expirationTimePwdChangeInSeconds = 100,
                    secret = SecurityJwtTokenSecretProperties(
                        value = "test-dummy".padEnd(50, 'A'),
                        algorithm = "HMACSHA256"
                    )
                )
            )
        )
        jwtTokenService = JwtTokenService(properties)
    }

    @Test
    fun `getClaimsFromToken - valid token generated and parsed`() {
        val token = jwtTokenService.generateToken(
            username = "test-user",
            fullName = "test-fullname",
            authorities = listOf(
                SimpleGrantedAuthority("dummy-role")
            ),
            expirationSeconds = 100
        )

        val claims = jwtTokenService.getClaimsFromToken(token)

        assertThat(claims[CLAIM_KEY_FULLNAME]).isEqualTo("test-fullname")
        assertThat(claims[CLAIM_KEY_PERMISSIONS] as List<*>).contains("dummy-role")
    }

    @Test
    fun `getClaimsFromToken - invalid token denied`() {
        val token = generateToken(overrideSecretKey = "wrongkey".padEnd(50, 'A'))

        assertThrows<SignatureException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    @Test
    fun `getClaimsFromToken - expired token denied`() {
        val token = generateToken(overrideExpirationTime = LocalDateTime.now().minusDays(1))

        assertThrows<ExpiredJwtException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    @Test
    fun `getClaimsFromToken - wrong issuer denied`() {
        val token = generateToken(overrideIssuer = "wrong")

        assertThrows<IncorrectClaimException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    @Test
    fun `getClaimsFromToken - missing issuer denied`() {
        val token = generateToken(issuerNull = true)

        assertThrows<MissingClaimException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    @Test
    fun `getClaimsFromToken - wrong audience denied`() {
        val token = generateToken(overrideAudience = "wrong")

        assertThrows<IncorrectClaimException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    @Test
    fun `getClaimsFromToken - missing audience denied`() {
        val token = generateToken(audienceNull = true)

        assertThrows<MissingClaimException> {
            jwtTokenService.getClaimsFromToken(token)
        }
    }

    @Test
    fun `getClaimsFromToken - token modified and rejected`() {
        val originalExpirationDate = LocalDateTime.now().plusHours(1)
        val originalToken = generateToken(overrideExpirationTime = originalExpirationDate)
        val tokenParts = originalToken.split(".")
        val tokenHeader = tokenParts[0]
        val tokenBody = tokenParts[1]
        val tokenSignature = tokenParts[2]

        val decodedBody = String(Base64.getDecoder().decode(tokenBody))
        val modifiedBody = decodedBody.replace(
            originalExpirationDate.atZone(ZoneId.systemDefault()).toEpochSecond().toString(),
            LocalDateTime.now().plusYears(1).atZone(ZoneId.systemDefault()).toEpochSecond().toString()
        )
        val modifiedBodyEncoded = Base64.getEncoder().encodeToString(modifiedBody.encodeToByteArray())

        val modifiedToken = "$tokenHeader.$modifiedBodyEncoded.$tokenSignature"

        assertThrows<SignatureException> {
            jwtTokenService.getClaimsFromToken(modifiedToken)
        }
    }

    private fun generateToken(
        overrideSecretKey: String? = null,
        overrideExpirationTime: LocalDateTime? = null,
        overrideIssuer: String? = null,
        issuerNull: Boolean? = false,
        overrideAudience: String? = null,
        audienceNull: Boolean? = false,
    ): String {
        val tokenProperties = properties.security.jwtToken

        val secretKeySpec =
            SecretKeySpec(
                (overrideSecretKey ?: tokenProperties.secret.value).toByteArray(),
                tokenProperties.secret.algorithm
            )
        val expirationTime = overrideExpirationTime ?: LocalDateTime.now().plusHours(1)
        val issuer = if (issuerNull == true) null else overrideIssuer ?: tokenProperties.issuer
        val audience = if (audienceNull == true) null else overrideAudience ?: tokenProperties.audience

        return Jwts.builder()
            .subject("dummy-subject")
            .issuer(issuer)
            .audience().add(audience)
            .and()
            .issuedAt(Date(System.currentTimeMillis()))
            .expiration(Date.from(expirationTime.atZone(ZoneId.systemDefault()).toInstant()))
            .signWith(secretKeySpec)
            .compact()
    }
}

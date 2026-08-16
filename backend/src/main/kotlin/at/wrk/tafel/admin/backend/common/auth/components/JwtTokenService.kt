package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import org.springframework.stereotype.Service
import java.time.Duration
import java.util.*
import javax.crypto.spec.SecretKeySpec

/**
 * Mints and parses identity-only JWTs: subject (username), issuer/audience and expiration - no
 * permissions claim. [TafelJwtAuthProvider] is what turns the subject into a concrete permission
 * list, read fresh from the DB on every request, so a permission change takes effect immediately
 * instead of only after the token expires and the user logs in again.
 */
@Service
class JwtTokenService(
    private val applicationProperties: ApplicationProperties,
) {
    fun getClaimsFromToken(token: String): Claims = createJwtParser()
        .parseSignedClaims(token)
        .payload

    fun generateToken(
        username: String,
        expirationSeconds: Int,
    ): String {
        val expirationMillis = Duration.ofSeconds(expirationSeconds.toLong()).toMillis()
        val expirationDate = Date(System.currentTimeMillis() + expirationMillis)
        val secretKeySpec = createSecretKeySpec()

        return Jwts.builder()
            .subject(username)
            .issuer(applicationProperties.security.jwtToken.issuer)
            .audience().add(applicationProperties.security.jwtToken.audience)
            .and()
            .issuedAt(Date(System.currentTimeMillis()))
            .expiration(expirationDate)
            .signWith(secretKeySpec)
            .compact()
    }

    private fun createJwtParser() = Jwts.parser()
        .verifyWith(createSecretKeySpec())
        .requireIssuer(applicationProperties.security.jwtToken.issuer)
        .requireAudience(applicationProperties.security.jwtToken.audience)
        .build()

    private fun createSecretKeySpec() = SecretKeySpec(
        applicationProperties.security.jwtToken.secret.value.toByteArray(),
        applicationProperties.security.jwtToken.secret.algorithm,
    )
}

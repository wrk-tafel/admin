package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import org.springframework.security.core.GrantedAuthority
import org.springframework.stereotype.Service
import java.time.Duration
import java.util.*
import javax.crypto.spec.SecretKeySpec

@Service
class JwtTokenService(
    private val applicationProperties: ApplicationProperties
) {
    companion object {
        const val PERMISSIONS_CLAIM_KEY = "permissions"
    }

    fun getClaimsFromToken(token: String): Claims {
        return createJwtParser()
            .parseSignedClaims(token)
            .payload
    }

    fun generateToken(
        username: String,
        authorities: Collection<GrantedAuthority>,
        expirationSeconds: Int
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
            .claim("permissions", authorities.map { it.authority })
            .signWith(secretKeySpec)
            .compact()
    }

    private fun createJwtParser() = Jwts.parser()
        .decryptWith(createSecretKeySpec())
        .verifyWith(createSecretKeySpec())
        .requireIssuer(applicationProperties.security.jwtToken.issuer)
        .requireAudience(applicationProperties.security.jwtToken.audience)
        .build()

    private fun createSecretKeySpec() =
        SecretKeySpec(
            applicationProperties.security.jwtToken.secret.value.toByteArray(),
            applicationProperties.security.jwtToken.secret.algorithm
        )

}

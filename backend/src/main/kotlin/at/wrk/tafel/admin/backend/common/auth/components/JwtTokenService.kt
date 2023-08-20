package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Header
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
        const val permissionsClaimKey = "permissions"
    }

    fun getClaimsFromToken(token: String): Claims {
        return createJwtParser()
            .parseClaimsJws(token)
            .body
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
            .setHeaderParam(Header.TYPE, Header.JWT_TYPE)
            .setSubject(username)
            .setIssuer(applicationProperties.security.jwtToken.issuer)
            .setAudience(applicationProperties.security.jwtToken.audience)
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(expirationDate)
            .claim("permissions", authorities.map { it.authority })
            .signWith(secretKeySpec)
            .compact()
    }

    private fun createJwtParser() = Jwts.parserBuilder()
        .setSigningKey(createSecretKeySpec())
        .requireIssuer(applicationProperties.security.jwtToken.issuer)
        .requireAudience(applicationProperties.security.jwtToken.audience)
        .build()

    private fun createSecretKeySpec() =
        SecretKeySpec(
            applicationProperties.security.jwtToken.secret.value.toByteArray(),
            applicationProperties.security.jwtToken.secret.algorithm
        )

}

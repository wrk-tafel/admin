package at.wrk.tafel.admin.backend.app.security.components

import at.wrk.tafel.admin.backend.common.config.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import org.springframework.security.core.GrantedAuthority
import org.springframework.stereotype.Service
import java.util.*
import javax.crypto.spec.SecretKeySpec

@Service
class JwtTokenService(
    private val applicationProperties: ApplicationProperties
) {

    fun getClaimsFromToken(token: String): Claims {
        return createJwtParser()
            .parseClaimsJws(token)
            .body
    }

    fun generateToken(username: String, authorities: Collection<GrantedAuthority>): String {
        val tokenSettings = applicationProperties.security.jwtToken

        val expirationMillis = tokenSettings.expirationTimeInSeconds * 1000
        val expirationDate = Date(System.currentTimeMillis() + expirationMillis)
        val secretKeySpec = createSecretKeySpec()

        return Jwts.builder()
            .setSubject(username)
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(expirationDate)
            .claim("roles", authorities.map { it.authority })
            .signWith(secretKeySpec)
            .compact()
    }

    private fun createJwtParser() = Jwts.parserBuilder()
        .setSigningKey(createSecretKeySpec())
        .build()

    private fun createSecretKeySpec() =
        SecretKeySpec(
            applicationProperties.security.jwtToken.secret.value.toByteArray(),
            applicationProperties.security.jwtToken.secret.algorithm
        )
}

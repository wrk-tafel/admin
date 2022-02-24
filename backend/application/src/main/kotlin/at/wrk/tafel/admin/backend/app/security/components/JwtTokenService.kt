package at.wrk.tafel.admin.backend.app.security.components

import at.wrk.tafel.admin.backend.common.config.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Header
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

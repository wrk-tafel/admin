package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.config.ApplicationProperties
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
        val expirationMillis = applicationProperties.security.jwtToken.expirationTimeInSeconds * 1000
        val expirationDate = Date(System.currentTimeMillis() + expirationMillis)
        val secretKeySpec = SecretKeySpec(applicationProperties.security.jwtToken.secret.toByteArray(), "HmacSHA512")

        return Jwts.builder()
            .setClaims(emptyMap<String, Any>())
            .setSubject(username)
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(expirationDate)
            .claim("roles", authorities.map { it.authority })
            .signWith(secretKeySpec)
            .compact()
    }

    private fun createJwtParser() = Jwts.parserBuilder()
        .setSigningKey(applicationProperties.security.jwtToken.secret)
        .build()

}

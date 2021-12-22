package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.config.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import org.springframework.stereotype.Service
import java.util.*

@Service
class JwtTokenService(
    private val applicationProperties: ApplicationProperties
) {

    fun getClaimsFromToken(token: String): Claims {
        return createJwtParser()
            .parseClaimsJws(token)
            .body
    }

    fun generateToken(username: String): String {
        val expirationMillis = applicationProperties.security.jwtToken.expirationTimeInSeconds * 1000
        val expirationDate = Date(System.currentTimeMillis() + expirationMillis)

        return Jwts.builder()
            .setClaims(emptyMap<String, Any>())
            .setSubject(username)
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(expirationDate)
            // TODO replace deprecated call
            .signWith(SignatureAlgorithm.HS512, applicationProperties.security.jwtToken.secret)
            .compact()
    }

    private fun createJwtParser() = Jwts.parserBuilder()
        .setSigningKey(applicationProperties.security.jwtToken.secret)
        .build()

}

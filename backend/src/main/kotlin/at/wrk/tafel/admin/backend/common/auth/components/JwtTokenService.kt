package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.config.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Header
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import org.springframework.security.core.GrantedAuthority
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.time.ZoneOffset
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
        val expirationMillis = expirationSeconds * 1000
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

    fun isValid(tokenValue: String): Boolean {
        return try {
            val expirationDate = createJwtParser().parseClaimsJws(tokenValue).body.expiration
                .toInstant().atZone(ZoneOffset.systemDefault()).toLocalDateTime()

            LocalDateTime.now().isBefore(expirationDate)
        } catch (e: JwtException) {
            false
        }
    }

}

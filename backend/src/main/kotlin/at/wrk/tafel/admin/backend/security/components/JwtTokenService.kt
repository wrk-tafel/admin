package at.wrk.tafel.admin.backend.security.components

import at.wrk.tafel.admin.backend.config.ApplicationProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import org.springframework.security.core.userdetails.UserDetails
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

    private fun createJwtParser() = Jwts.parserBuilder()
        .setSigningKey(applicationProperties.security.jwtToken.secret)
        .build()

    /*** TODO REWORK BELOW TODO ***/
    /*** TODO REWORK BELOW TODO ***/
    /*** TODO REWORK BELOW TODO ***/
    /*** TODO REWORK BELOW TODO ***/
    /*** TODO REWORK BELOW TODO ***/

    //generate token for user
    fun generateToken(userDetails: UserDetails): String {
        val claims: Map<String, Any> = HashMap()
        return doGenerateToken(claims, userDetails.username)
    }

    //while creating the token -
    //1. Define  claims of the token, like Issuer, Expiration, Subject, and the ID
    //2. Sign the JWT using the HS512 algorithm and secret key.
    //3. According to JWS Compact Serialization(https://tools.ietf.org/html/draft-ietf-jose-json-web-signature-41#section-3.1)
    //   compaction of the JWT to a URL-safe string
    private fun doGenerateToken(claims: Map<String, Any>, subject: String): String {
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(subject)
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(Date(System.currentTimeMillis() + (applicationProperties.security.jwtToken.expirationTimeInSeconds * 1000)))
            // TODO replace deprecated call
            .signWith(SignatureAlgorithm.HS512, applicationProperties.security.jwtToken.secret)
            .compact()
    }

}

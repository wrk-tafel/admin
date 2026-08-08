package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
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
    private val applicationProperties: ApplicationProperties,
) {
    companion object {
        const val PERMISSIONS_CLAIM_KEY = "permissions"
    }

    fun getClaimsFromToken(token: String): Claims = createJwtParser()
        .parseSignedClaims(token)
        .payload

    fun generateToken(
        username: String,
        authorities: Collection<GrantedAuthority>,
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
            .claim(PERMISSIONS_CLAIM_KEY, effectivePermissions(authorities))
            .signWith(secretKeySpec)
            .compact()
    }

    /**
     * [UserPermissions.ADMINISTRATOR] grants everything, so it is written into the token as the full
     * permission list rather than as itself alone. Doing it here - the one place a session's
     * authorities are minted - is what makes it hold for every consumer at once: `@PreAuthorize` on
     * the backend reads these authorities, `/api/users/info` echoes them, and the frontend's route
     * guards and `tafelIfPermission` directive go by that same list.
     *
     * Deliberately *not* done when a user is loaded for the user-management screens: what is stored
     * against the account stays the single `ADMINISTRATOR` entry, so the permission editor keeps
     * showing what was actually assigned instead of every box ticked - and saving such a user cannot
     * silently write the expanded set back.
     */
    private fun effectivePermissions(authorities: Collection<GrantedAuthority>): List<String> {
        val granted = authorities.mapNotNull { it.authority }
        return if (granted.contains(UserPermissions.ADMINISTRATOR.key)) {
            UserPermissions.entries.map { it.key }
        } else {
            granted
        }
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

package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.auth.UserAuthorityEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import io.jsonwebtoken.Claims
import io.jsonwebtoken.MalformedJwtException
import io.jsonwebtoken.impl.DefaultClaims
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.security.authentication.DisabledException
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.util.*

@ExtendWith(MockKExtension::class)
internal class TafelJwtAuthProviderTest {

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @InjectMockKs
    private lateinit var provider: TafelJwtAuthProvider

    @Test
    fun `supports with wrong class results in false`() {
        val result = provider.supports(Exception::class.java)

        assertThat(result).isFalse
    }

    @Test
    fun `supports with correct class results in true`() {
        val result = provider.supports(TafelJwtAuthentication::class.java)

        assertThat(result).isTrue
    }

    @Test
    fun `authenticate successful reads permissions from the DB, not the token`() {
        val username = "SUBJ"
        val tokenValue = "TOKEN"
        val perm1 = "PERM1"
        val expiration = Date.from(LocalDateTime.now().plusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = tokenValue)
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
            ),
        )
        val userEntity = UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = true,
        )
        userEntity.id = 42
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = perm1))
        every { userRepository.findByUsername(username) } returns userEntity

        val resultingAuthentication = provider.authenticate(authentication)

        assertThat(resultingAuthentication).isNotNull
        assertThat(resultingAuthentication.isAuthenticated).isTrue
        assertThat(resultingAuthentication.name).isEqualTo("SUBJ")
        assertThat(resultingAuthentication.authorities.joinToString(",")).isEqualTo(perm1)
        // AuditActorProvider.currentUserId() reads this instead of looking the user up again -
        // see JwtAuthenticationModel.kt's KDoc on userId for why.
        assertThat(resultingAuthentication.userId).isEqualTo(42)
    }

    /**
     * ADMINISTRATOR grants everything, so authenticating as one is expanded into every permission -
     * every `@PreAuthorize`, the frontend's route guards and its `tafelIfPermission` directive all
     * read what lands on the resulting authentication.
     */
    @Test
    fun `authenticate expands the administrator permission into every permission`() {
        val username = "SUBJ"
        val expiration = Date.from(LocalDateTime.now().plusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
            ),
        )
        val userEntity = UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = true,
        )
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = UserPermissions.ADMINISTRATOR.key))
        every { userRepository.findByUsername(username) } returns userEntity

        val resultingAuthentication = provider.authenticate(authentication)

        assertThat(resultingAuthentication.authorities.mapNotNull { it.authority })
            .containsExactlyInAnyOrderElementsOf(UserPermissions.entries.map { it.key })
    }

    @Test
    fun `authenticate grants no permissions while a password change is still required`() {
        val username = "SUBJ"
        val expiration = Date.from(LocalDateTime.now().plusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
            ),
        )
        val userEntity = UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = true,
            passwordChangeRequired = true,
        )
        userEntity.authorities = mutableListOf(UserAuthorityEntity(user = userEntity, name = UserPermissions.ADMINISTRATOR.key))
        every { userRepository.findByUsername(username) } returns userEntity

        val resultingAuthentication = provider.authenticate(authentication)

        assertThat(resultingAuthentication.authorities).isEmpty()
    }

    @Test
    fun `authenticate with expired token fails`() {
        val username = "SUBJ"
        val tokenValue = "TOKEN"
        val expiration = Date.from(LocalDateTime.now().minusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = tokenValue)
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
            ),
        )

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(authentication)
        }
    }

    @Test
    fun `authenticate with invalid token fails`() {
        val tokenValue = "TOKEN"

        val authentication = TafelJwtAuthentication(tokenValue = tokenValue)
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } throws MalformedJwtException("exception")

        assertThrows<BadCredentialsException> {
            provider.authenticate(authentication)
        }
    }

    @Test
    fun `authenticate with valid token but disabled user fails`() {
        val username = "SUBJ"
        val expiration = Date.from(LocalDateTime.now().plusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
            ),
        )
        every { userRepository.findByUsername(username) } returns UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = false,
        )

        assertThrows<DisabledException> {
            provider.authenticate(authentication)
        }
    }

    @Test
    fun `authenticate rejects a token issued before tokenInvalidatedAt`() {
        val username = "SUBJ"
        val now = LocalDateTime.now()
        val issuedAt = Date.from(now.minusMinutes(5).atZone(ZoneId.systemDefault()).toInstant())
        val expiration = Date.from(now.plusDays(1).atZone(ZoneId.systemDefault()).toInstant())

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
                Claims.ISSUED_AT to issuedAt,
            ),
        )
        val userEntity = UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = true,
        ).apply { tokenInvalidatedAt = now.minusMinutes(1) }
        every { userRepository.findByUsername(username) } returns userEntity

        assertThrows<CredentialsExpiredException> {
            provider.authenticate(authentication)
        }
    }

    @Test
    fun `authenticate accepts a token issued after tokenInvalidatedAt`() {
        val username = "SUBJ"
        val now = LocalDateTime.now()
        val issuedAt = Date.from(now.atZone(ZoneId.systemDefault()).toInstant())
        val expiration = Date.from(now.plusDays(1).atZone(ZoneId.systemDefault()).toInstant())

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
                Claims.ISSUED_AT to issuedAt,
            ),
        )
        val userEntity = UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = true,
        ).apply { tokenInvalidatedAt = now.minusMinutes(1) }
        every { userRepository.findByUsername(username) } returns userEntity

        val resultingAuthentication = provider.authenticate(authentication)

        assertThat(resultingAuthentication.isAuthenticated).isTrue
    }

    /**
     * The JWT `iat` claim only carries whole-second precision (RFC 7519 NumericDate), while
     * `tokenInvalidatedAt` is stored with sub-second precision - a token reissued in the very same
     * second as the invalidating event (see UserController.changePassword, which mints a
     * replacement token right after invalidating the request's own) must not be rejected just
     * because of that truncation.
     */
    @Test
    fun `authenticate accepts a token issued in the same second as tokenInvalidatedAt`() {
        val username = "SUBJ"
        val now = LocalDateTime.now()
        val issuedAtSecond = now.truncatedTo(ChronoUnit.SECONDS)
        val issuedAt = Date.from(issuedAtSecond.atZone(ZoneId.systemDefault()).toInstant())
        val expiration = Date.from(now.plusDays(1).atZone(ZoneId.systemDefault()).toInstant())

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
                Claims.ISSUED_AT to issuedAt,
            ),
        )
        val userEntity = UserEntity(
            username = username,
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
            enabled = true,
            // Later in the same second as issuedAtSecond - would fail a naive `issuedAt.isAfter(x)`
            // comparison, since issuedAt was truncated down to the start of that second.
        ).apply { tokenInvalidatedAt = issuedAtSecond.plusNanos(500_000_000) }
        every { userRepository.findByUsername(username) } returns userEntity

        val resultingAuthentication = provider.authenticate(authentication)

        assertThat(resultingAuthentication.isAuthenticated).isTrue
    }

    /**
     * 2026-10-25 is the EU DST fall-back day in Europe/Vienna: local time 02:00-02:59:59 occurs
     * twice, once at offset +02:00 (CEST, before the transition) and once at +01:00 (CET, after).
     * `tokenInvalidatedAt` is a naive `LocalDateTime` with no recorded offset, so comparing it
     * against `issuedAt` after converting *both* through a zoned `LocalDateTime` (the pre-fix
     * approach) can make a token issued strictly after the invalidating event read as issued
     * before it, since the ambiguous local time collapses two different real instants into one.
     * Here the invalidation happened during the first (CEST) occurrence at 02:20 - real instant
     * 00:20 UTC - and the token was issued during the second (CET) occurrence at 02:05 - real
     * instant 01:05 UTC, chronologically *after* the invalidation despite reading as an earlier
     * wall-clock time. Comparing as instants keeps this token valid; the pre-fix `LocalDateTime`
     * comparison rejected it.
     */
    @Test
    fun `authenticate compares issuedAt against tokenInvalidatedAt as instants across a DST fall-back`() {
        val originalDefaultTimeZone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of("Europe/Vienna")))
        try {
            val username = "SUBJ"
            val tokenInvalidatedAt = LocalDateTime.of(2026, 10, 25, 2, 20, 0)
            val issuedAtInstant = LocalDateTime.of(2026, 10, 25, 2, 5, 0).atOffset(ZoneOffset.ofHours(1)).toInstant()
            val issuedAt = Date.from(issuedAtInstant)
            val expiration = Date.from(issuedAtInstant.plusSeconds(60 * 60 * 24))

            val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
            every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
                mapOf(
                    Claims.SUBJECT to username,
                    Claims.EXPIRATION to expiration,
                    Claims.ISSUED_AT to issuedAt,
                ),
            )
            val userEntity = UserEntity(
                username = username,
                password = "pwd",
                employee = EmployeeEntity(personnelNumber = "1", firstname = "test", lastname = "test"),
                enabled = true,
            ).apply { this.tokenInvalidatedAt = tokenInvalidatedAt }
            every { userRepository.findByUsername(username) } returns userEntity

            val resultingAuthentication = provider.authenticate(authentication)

            assertThat(resultingAuthentication.isAuthenticated).isTrue
        } finally {
            TimeZone.setDefault(originalDefaultTimeZone)
        }
    }

    @Test
    fun `authenticate with valid token but deleted user fails`() {
        val username = "SUBJ"
        val expiration = Date.from(LocalDateTime.now().plusDays(1).toInstant(ZoneOffset.MIN))

        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN")
        every { jwtTokenService.getClaimsFromToken(authentication.tokenValue) } returns DefaultClaims(
            mapOf(
                Claims.SUBJECT to username,
                Claims.EXPIRATION to expiration,
            ),
        )
        every { userRepository.findByUsername(username) } returns null

        assertThrows<DisabledException> {
            provider.authenticate(authentication)
        }
    }
}

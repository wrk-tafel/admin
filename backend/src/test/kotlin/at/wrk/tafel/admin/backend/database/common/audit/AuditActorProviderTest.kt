package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder

class AuditActorProviderTest {

    private val provider = AuditActorProvider()

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `returns the username of the authenticated user`() {
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication(tokenValue = "token", username = "test-user", authenticated = true)

        assertThat(provider.currentUsername()).isEqualTo("test-user")
    }

    @Test
    fun `returns null without an authentication - a scheduled job has no actor`() {
        assertThat(provider.currentUsername()).isNull()
    }

    @Test
    fun `returns null while the authentication is not yet authenticated`() {
        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication(tokenValue = "token", username = "test-user", authenticated = false)

        assertThat(provider.currentUsername()).isNull()
    }

    @Test
    fun `does not record the anonymous placeholder as an actor`() {
        SecurityContextHolder.getContext().authentication = AnonymousAuthenticationToken(
            "key",
            "anonymousUser",
            listOf(SimpleGrantedAuthority("ROLE_ANONYMOUS")),
        )

        assertThat(provider.currentUsername()).isNull()
    }
}

package at.wrk.tafel.admin.backend.security

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.test.context.support.WithAnonymousUser
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.stereotype.Service
import org.springframework.test.context.junit.jupiter.SpringExtension

/**
 * TODO not sure if this really makes sense (if that tests the security configuration in any way)
 * TODO maybe better to replace by a mockmvc test
 */
@ExtendWith(SpringExtension::class)
@SpringBootTest
@Disabled
class GeneralMethodSecurityIT {

    @Autowired
    private lateinit var testService: TestService

    @Test
    fun `public is secured by default`() {
        assertThrows<AccessDeniedException> {
            testService.getPublic()
        }
    }

    @Test
    @WithAnonymousUser
    fun `public is also not accessible by anonymous user`() {
        assertThrows<AccessDeniedException> {
            testService.getPublic()
        }
    }

    @Test
    fun `authenticated - called without authentication`() {
        assertThrows<AuthenticationCredentialsNotFoundException> {
            testService.getAuthenticated()
        }
    }

    @Test
    @WithAnonymousUser
    fun `authenticated - not accessible as anonymous`() {
        assertThrows<AccessDeniedException> {
            testService.getAuthenticated()
        }
    }

    @Test
    @WithMockUser
    fun `authenticated - called with authentication`() {
        val result = testService.getAuthenticated()
        assertThat(result).isEqualTo("authenticated")
    }

    @Test
    @WithMockUser(roles = ["ROLE1"])
    fun `role1 - called with correct authentication`() {
        val result = testService.getRole1()
        assertThat(result).isEqualTo("role1")
    }

    @Test
    @WithMockUser(roles = ["ROLE2"])
    fun `role1 - called with invalid authentication`() {
        assertThrows<AccessDeniedException> {
            testService.getRole1()
        }
    }
}

@Service
class TestService {

    fun getPublic(): String {
        return "public"
    }

    @PreAuthorize("isAuthenticated()")
    fun getAuthenticated(): String {
        return "authenticated"
    }

    @PreAuthorize("hasRole('ROLE1')")
    fun getRole1(): String {
        return "role1"
    }
}

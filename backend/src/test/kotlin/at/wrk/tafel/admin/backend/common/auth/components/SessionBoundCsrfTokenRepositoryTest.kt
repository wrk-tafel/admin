package at.wrk.tafel.admin.backend.common.auth.components

import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.DefaultCsrfToken

@ExtendWith(MockKExtension::class)
class SessionBoundCsrfTokenRepositoryTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    private lateinit var cookieTokenRepository: CookieCsrfTokenRepository
    private lateinit var repository: SessionBoundCsrfTokenRepository

    @BeforeEach
    fun beforeEach() {
        cookieTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse()
        repository = SessionBoundCsrfTokenRepository(delegate = cookieTokenRepository, secret = "test-secret")
    }

    @Test
    fun `generated token is the same for every request of the same session`() {
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, "jwt-value"))

        val firstToken = repository.generateToken(request)
        val secondToken = repository.generateToken(request)

        assertThat(firstToken.token).isEqualTo(secondToken.token)
        assertThat(firstToken.headerName).isEqualTo("X-XSRF-TOKEN")
        assertThat(firstToken.parameterName).isEqualTo("_csrf")
    }

    @Test
    fun `generated token differs between sessions`() {
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, "jwt-value-1"))
        val firstToken = repository.generateToken(request)

        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, "jwt-value-2"))
        val secondToken = repository.generateToken(request)

        assertThat(firstToken.token).isNotEqualTo(secondToken.token)
    }

    @Test
    fun `generated token doesnt expose the jwt`() {
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, "jwt-value"))

        val token = repository.generateToken(request)

        assertThat(token.token).doesNotContain("jwt-value")
    }

    @Test
    fun `generated token differs per secret`() {
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, "jwt-value"))
        val otherRepository = SessionBoundCsrfTokenRepository(delegate = cookieTokenRepository, secret = "other-secret")

        val token = repository.generateToken(request)
        val otherToken = otherRepository.generateToken(request)

        assertThat(token.token).isNotEqualTo(otherToken.token)
    }

    @Test
    fun `generated token falls back to a random value without a jwt cookie`() {
        every { request.cookies } returns arrayOf(Cookie("unrelated-cookie", "value"))

        val firstToken = repository.generateToken(request)
        val secondToken = repository.generateToken(request)

        assertThat(firstToken.token).isNotEqualTo(secondToken.token)
    }

    @Test
    fun `generated token falls back to a random value for a blank jwt cookie`() {
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, ""))

        val firstToken = repository.generateToken(request)
        val secondToken = repository.generateToken(request)

        assertThat(firstToken.token).isNotEqualTo(secondToken.token)
    }

    @Test
    fun `saving and loading a token is delegated to the cookie repository`() {
        val token = DefaultCsrfToken("X-XSRF-TOKEN", "_csrf", "token-value")
        val delegate = mockk<CookieCsrfTokenRepository>(relaxed = true)
        every { delegate.loadToken(request) } returns token
        val delegatingRepository = SessionBoundCsrfTokenRepository(delegate = delegate, secret = "test-secret")

        delegatingRepository.saveToken(token, request, response)

        assertThat(delegatingRepository.loadToken(request)).isEqualTo(token)
        verify { delegate.saveToken(token, request, response) }
    }
}

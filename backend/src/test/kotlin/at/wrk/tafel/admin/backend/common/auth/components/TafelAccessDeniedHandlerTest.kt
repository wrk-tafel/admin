package at.wrk.tafel.admin.backend.common.auth.components

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.servlet.DispatcherType
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.csrf.DefaultCsrfToken
import org.springframework.security.web.csrf.InvalidCsrfTokenException
import org.springframework.security.web.csrf.MissingCsrfTokenException

@ExtendWith(MockKExtension::class)
class TafelAccessDeniedHandlerTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    private val handler = TafelAccessDeniedHandler()

    @BeforeEach
    fun beforeEach() {
        logger = LoggerFactory.getLogger(TafelAccessDeniedHandler::class.java) as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)

        every { request.dispatcherType } returns DispatcherType.REQUEST
        every { request.method } returns "POST"
        every { request.requestURI } returns "/api/food-collections/routes/4/items"
        every { response.isCommitted } returns false
    }

    @AfterEach
    fun afterEach() {
        logger.detachAppender(logAppender)
        logger.level = null
        SecurityContextHolder.clearContext()
    }

    private fun loggedMessage() = logAppender.list.single().formattedMessage

    @Test
    fun `logs the denial cause and the CSRF token state on a missing header`() {
        every { request.getHeader("X-XSRF-TOKEN") } returns null
        every { request.cookies } returns arrayOf(Cookie("XSRF-TOKEN", "cookie-value"))

        handler.handle(request, response, InvalidCsrfTokenException(DefaultCsrfToken("X-XSRF-TOKEN", "_csrf", "expected"), "actual"))

        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(loggedMessage())
            .contains("InvalidCsrfTokenException")
            .contains("not an authorization failure")
            .contains("X-XSRF-TOKEN header missing")
            .contains("XSRF-TOKEN cookie present")
    }

    @Test
    fun `reports a missing CSRF cookie as missing`() {
        every { request.getHeader("X-XSRF-TOKEN") } returns "some-token"
        every { request.cookies } returns null

        handler.handle(request, response, MissingCsrfTokenException("actual"))

        assertThat(loggedMessage())
            .contains("MissingCsrfTokenException")
            .contains("X-XSRF-TOKEN header present")
            .contains("XSRF-TOKEN cookie missing")
    }

    @Test
    fun `reports a blank CSRF header as missing`() {
        every { request.getHeader("X-XSRF-TOKEN") } returns "   "
        every { request.cookies } returns arrayOf(Cookie("XSRF-TOKEN", "cookie-value"))

        handler.handle(request, response, MissingCsrfTokenException("actual"))

        assertThat(loggedMessage()).contains("X-XSRF-TOKEN header missing")
    }

    @Test
    fun `reports the CSRF cookie as missing when only an unrelated cookie or a blank value is present`() {
        every { request.getHeader("X-XSRF-TOKEN") } returns "some-token"
        every { request.cookies } returns arrayOf(Cookie("unrelated-cookie", "value"), Cookie("XSRF-TOKEN", ""))

        handler.handle(request, response, MissingCsrfTokenException("actual"))

        assertThat(loggedMessage()).contains("XSRF-TOKEN cookie missing")
    }

    @Test
    fun `logs principal and authorities for a non-CSRF denial`() {
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken(
            "some-user",
            null,
            listOf(SimpleGrantedAuthority("LOGISTICS")),
        )

        handler.handle(request, response, AccessDeniedException("Access Denied"))

        assertThat(loggedMessage())
            .contains("some-user")
            .contains("LOGISTICS")
            .contains("AccessDeniedException: Access Denied")
            .doesNotContain("not an authorization failure")
    }

    @Test
    fun `logs an ASYNC dispatch denial at debug without writing a response`() {
        logger.level = Level.DEBUG
        every { request.dispatcherType } returns DispatcherType.ASYNC

        handler.handle(request, response, AccessDeniedException("Access Denied"))

        assertThat(logAppender.list.single().level).isEqualTo(Level.DEBUG)
        assertThat(loggedMessage()).contains("ASYNC dispatch")
    }
}

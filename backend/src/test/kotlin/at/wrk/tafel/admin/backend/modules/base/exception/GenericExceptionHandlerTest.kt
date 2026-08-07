package at.wrk.tafel.admin.backend.modules.base.exception

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.context.MessageSource
import org.springframework.core.MethodParameter
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpInputMessage
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.authorization.AuthorizationDeniedException
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.validation.BeanPropertyBindingResult
import org.springframework.validation.FieldError
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.context.request.ServletWebRequest
import org.springframework.web.context.request.WebRequest
import org.springframework.web.context.request.async.AsyncRequestNotUsableException
import tools.jackson.databind.json.JsonMapper
import java.util.*

@ExtendWith(MockKExtension::class)
internal class GenericExceptionHandlerTest {

    @RelaxedMockK
    private lateinit var messageSource: MessageSource

    @RelaxedMockK
    private lateinit var request: ServletWebRequest

    @RelaxedMockK
    private lateinit var jsonMapper: JsonMapper

    @InjectMockKs
    private lateinit var exceptionHandler: GenericExceptionHandler

    private lateinit var logAppender: ListAppender<ILoggingEvent>
    private lateinit var logger: Logger

    @BeforeEach
    fun beforeEach() {
        every { request.request.requestURI } returns "/dummy-path"
        every { request.getDescription(false) } returns "uri=/dummy-path"
        every { request.locale } returns Locale.GERMAN
        stubMessages { code -> "localized-${code.substringAfterLast('.')}" }

        logger = LoggerFactory.getLogger(GenericExceptionHandler::class.java) as Logger
        logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)
    }

    @AfterEach
    fun afterEach() {
        logger.detachAppender(logAppender)
    }

    /**
     * Stubs the *four*-argument `getMessage` overload - the one the handler deliberately uses, since
     * it returns `null` for an unconfigured key instead of throwing, see
     * `GenericExceptionHandler.localizedMessage`.
     *
     * [resolve] returning a value for every `http-error.<status>.title`/`.detail` key mirrors what the
     * real `i18n/messages.properties` provides, so the assertions below can check for
     * `localized-title`/`localized-detail` regardless of status.
     */
    private fun stubMessages(resolve: (String) -> String?) {
        every { messageSource.getMessage(any<String>(), any(), null, Locale.GERMAN) } answers {
            resolve(firstArg<String>())
        }
    }

    /**
     * Every one of these passes `body = null`, because that is what Spring actually does: the
     * inherited `handleErrorResponseException` calls `handleExceptionInternal(ex, null, ...)` and
     * expects the body to be taken from the exception's own `ErrorResponse.getBody`. Passing
     * `exception.body` here instead (as these tests used to) exercises a call shape production
     * never produces, and hid that every [TafelApiException] rendered its detail as the exception's
     * `toString()` - `"404 NOT_FOUND, ProblemDetail[type='null', title='Not Found', ...]"`.
     */
    @Test
    fun `handles NotFoundException properly`() {
        val exception = NotFoundException("notfound-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.NOT_FOUND.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("notfound-msg")
    }

    @Test
    fun `logs every handled exception at warn with method, uri, status and exception type`() {
        every { request.request.method } returns "DELETE"
        val exception = NotFoundException("notfound-msg")

        exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(logAppender.list.single().level).isEqualTo(Level.WARN)
        assertThat(logAppender.list.single().formattedMessage)
            .contains("DELETE")
            .contains("uri=/dummy-path")
            .contains("404")
            .contains("NotFoundException")
            .contains("notfound-msg")
    }

    @Test
    fun `handles ConflictException properly`() {
        val exception = ConflictException("conflict-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CONFLICT)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.CONFLICT.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("conflict-msg")
    }

    @Test
    fun `handles BusinessRuleException with default status`() {
        val exception = BusinessRuleException("businessrule-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("businessrule-msg")
    }

    @Test
    fun `handles BusinessRuleException with explicit status`() {
        val exception = BusinessRuleException("businessrule-msg", status = HttpStatus.UNPROCESSABLE_CONTENT)

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("businessrule-msg")
    }

    @Test
    fun `an explicitly passed body still wins over the exception's own`() {
        val exception = BusinessRuleException("businessrule-msg")
        val explicitBody = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "explicit-detail")

        val response = exceptionHandler.handleExceptionInternal(exception, explicitBody, HttpHeaders.EMPTY, exception.statusCode, request)

        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.detail).isEqualTo("explicit-detail")
    }

    /**
     * The two shapes issue #3008 is about. A built-in MVC exception either carries its own English
     * detail ("Method 'DELETE' is not supported.") or - for the ones Spring answers via
     * `createProblemDetail`, such as [HttpMessageNotReadableException] - one already run through the
     * `MessageSource`, which used to hand back the unresolved `problemDetail.<exception class>` code
     * itself. Neither may reach the client.
     */
    @Test
    fun `replaces the detail of a spring built-in exception carrying its own message`() {
        val exception = HttpRequestMethodNotSupportedException("DELETE")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("localized-detail")
    }

    @Test
    fun `replaces an unresolved message code passed as the detail by spring's own handler`() {
        val exception = HttpMessageNotReadableException("Failed to read request", mockk<HttpInputMessage>(relaxed = true))
        val springBody = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "problemDetail.org.springframework.http.converter.HttpMessageNotReadableException",
        )

        val response = exceptionHandler.handleExceptionInternal(exception, springBody, HttpHeaders.EMPTY, HttpStatus.BAD_REQUEST, request)

        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.detail).isEqualTo("localized-detail")
    }

    @Test
    fun `falls back to the default message code for a status without its own key`() {
        stubMessages { code -> if (code.startsWith("http-error.default.")) "default-${code.substringAfterLast('.')}" else null }
        val exception = HttpRequestMethodNotSupportedException("DELETE")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.title).isEqualTo("default-title")
        assertThat(errorBody.detail).isEqualTo("default-detail")
    }

    @Test
    fun `falls back to a hardcoded german message when nothing resolves at all`() {
        stubMessages { null }
        val exception = HttpRequestMethodNotSupportedException("DELETE")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, exception.statusCode, request)

        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.title).isEqualTo("Fehler")
        assertThat(errorBody.detail).isEqualTo("Es ist ein unerwarteter Fehler aufgetreten.")
    }

    @Test
    fun `an exception carrying no problem detail is answered with the localized generic detail`() {
        val exception = IllegalStateException("plain-exception-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, null, HttpHeaders.EMPTY, HttpStatus.BAD_REQUEST, request)

        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.detail).isEqualTo("localized-detail")
    }

    @Test
    fun `handles AccessDeniedException with 403 instead of falling through to 500`() {
        val response = exceptionHandler.handleAccessDeniedException(AuthorizationDeniedException("Access Denied"), request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.FORBIDDEN.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("localized-detail")
    }

    @Test
    fun `handles AccessDeniedException for an authenticated user with resolved authorities`() {
        every { request.request.method } returns "POST"
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken(
            "some-user",
            null,
            listOf(SimpleGrantedAuthority("LOGISTICS")),
        )

        try {
            val response = exceptionHandler.handleAccessDeniedException(AuthorizationDeniedException("Access Denied"), request)

            assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        } finally {
            SecurityContextHolder.clearContext()
        }
    }

    @Test
    fun `handles AccessDeniedException for a non-servlet WebRequest`() {
        val plainWebRequest = mockk<WebRequest>(relaxed = true)
        every { plainWebRequest.locale } returns Locale.GERMAN

        val response = exceptionHandler.handleAccessDeniedException(AuthorizationDeniedException("Access Denied"), plainWebRequest)

        assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
    }

    @Test
    fun `handles MethodArgumentNotValidException properly`() {
        val bindingResult = BeanPropertyBindingResult("target", "targetObject")
        bindingResult.addError(FieldError("targetObject", "fieldOne", "must not be blank"))
        bindingResult.addError(FieldError("targetObject", "fieldTwo", "must be positive"))
        val exception = MethodArgumentNotValidException(mockk<MethodParameter>(relaxed = true), bindingResult)

        val response = exceptionHandler.handleMethodArgumentNotValid(exception, HttpHeaders.EMPTY, HttpStatus.BAD_REQUEST, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        // the wording this handler sets itself survives the generic substitution
        assertThat(errorBody.detail).isEqualTo("Validierung fehlgeschlagen")
        assertThat(errorBody.properties?.get("errors")).isEqualTo(
            listOf(
                FieldErrorItem("fieldOne", "must not be blank"),
                FieldErrorItem("fieldTwo", "must be positive"),
            ),
        )
    }

    @Test
    fun `handles Exception properly`() {
        val exception = IllegalArgumentException("test-msg")

        val response = exceptionHandler.handleGenericException(exception, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        // never the raw exception message, which is internal technical text
        assertThat(errorBody.detail).isEqualTo("localized-detail")
    }

    @Test
    fun `handles AsyncRequestNotUsableException without throwing and returns no body`() {
        val exception = AsyncRequestNotUsableException("response no longer usable")

        val response = exceptionHandler.handleAsyncRequestNotUsableException(exception, request)

        assertThat(response).isNull()
    }

    @Test
    fun `handles exception in SSE properly`() {
        every { request.getHeader("Accept") } returns "text/event-stream"
        val exception = IllegalArgumentException("test-msg")
        every { jsonMapper.writeValueAsString(any()) } returns exception.message

        val response = exceptionHandler.handleGenericException(exception, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        val errorBody = response.body as String
        assertThat(errorBody).isEqualTo("event: error\ndata: ${exception.message}\n\n")
    }
}

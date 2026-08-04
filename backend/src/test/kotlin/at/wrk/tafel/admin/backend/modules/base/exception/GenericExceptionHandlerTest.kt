package at.wrk.tafel.admin.backend.modules.base.exception

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.MessageSource
import org.springframework.core.MethodParameter
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.validation.BeanPropertyBindingResult
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.context.request.ServletWebRequest
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

    @BeforeEach
    fun beforeEach() {
        every { request.request.requestURI } returns "/dummy-path"
        every { request.locale } returns Locale.GERMAN
    }

    @Test
    fun `handles NotFoundException properly`() {
        every {
            messageSource.getMessage("http-error.${HttpStatus.NOT_FOUND.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"
        val exception = NotFoundException("notfound-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, exception.body, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.NOT_FOUND.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("notfound-msg")
    }

    @Test
    fun `handles ConflictException properly`() {
        every {
            messageSource.getMessage("http-error.${HttpStatus.CONFLICT.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"
        val exception = ConflictException("conflict-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, exception.body, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CONFLICT)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.CONFLICT.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("conflict-msg")
    }

    @Test
    fun `handles BusinessRuleException with default status`() {
        every {
            messageSource.getMessage("http-error.${HttpStatus.BAD_REQUEST.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"
        val exception = BusinessRuleException("businessrule-msg")

        val response = exceptionHandler.handleExceptionInternal(exception, exception.body, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("businessrule-msg")
    }

    @Test
    fun `handles BusinessRuleException with explicit status`() {
        every {
            messageSource.getMessage("http-error.${HttpStatus.UNPROCESSABLE_CONTENT.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"
        val exception = BusinessRuleException("businessrule-msg", status = HttpStatus.UNPROCESSABLE_CONTENT)

        val response = exceptionHandler.handleExceptionInternal(exception, exception.body, HttpHeaders.EMPTY, exception.statusCode, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("businessrule-msg")
    }

    @Test
    fun `handles MethodArgumentNotValidException properly`() {
        every {
            messageSource.getMessage("http-error.${HttpStatus.BAD_REQUEST.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"

        val bindingResult = BeanPropertyBindingResult("target", "targetObject")
        bindingResult.addError(FieldError("targetObject", "fieldOne", "must not be blank"))
        bindingResult.addError(FieldError("targetObject", "fieldTwo", "must be positive"))
        val exception = MethodArgumentNotValidException(mockk<MethodParameter>(relaxed = true), bindingResult)

        val response = exceptionHandler.handleMethodArgumentNotValid(exception, HttpHeaders.EMPTY, HttpStatus.BAD_REQUEST, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.properties?.get("errors")).isEqualTo(
            listOf(
                FieldErrorItem("fieldOne", "must not be blank"),
                FieldErrorItem("fieldTwo", "must be positive"),
            ),
        )
    }

    @Test
    fun `handles Exception properly`() {
        every {
            messageSource.getMessage("http-error.${HttpStatus.INTERNAL_SERVER_ERROR.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"
        val exception = IllegalArgumentException("test-msg")

        val response = exceptionHandler.handleGenericException(exception, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        val errorBody = response.body as ProblemDetail
        assertThat(errorBody.status).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value())
        assertThat(errorBody.title).isEqualTo("localized-title")
        assertThat(errorBody.detail).isEqualTo("test-msg")
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
        every {
            messageSource.getMessage("http-error.${HttpStatus.INTERNAL_SERVER_ERROR.value()}.title", arrayOf<Any>(), Locale.GERMAN)
        } returns "localized-title"
        val exception = IllegalArgumentException("test-msg")
        every { jsonMapper.writeValueAsString(any()) } returns exception.message

        val response = exceptionHandler.handleGenericException(exception, request)

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        val errorBody = response.body as String
        assertThat(errorBody).isEqualTo("event: error\ndata: ${exception.message}\n\n")
    }
}

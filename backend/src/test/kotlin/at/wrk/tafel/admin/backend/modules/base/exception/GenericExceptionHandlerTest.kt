package at.wrk.tafel.admin.backend.modules.base.exception

import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.MessageSource
import org.springframework.http.HttpStatus
import org.springframework.web.context.request.ServletWebRequest
import java.util.*

@ExtendWith(MockKExtension::class)
internal class GenericExceptionHandlerTest {

    @RelaxedMockK
    private lateinit var messageSource: MessageSource

    @RelaxedMockK
    private lateinit var request: ServletWebRequest

    @InjectMockKs
    private lateinit var exceptionHandler: GenericExceptionHandler

    @BeforeEach
    fun beforeEach() {
        every { request.request.requestURI } returns "/dummy-path"
    }

    @Test
    fun `handles Exception properly`() {
        every {
            messageSource.getMessage(
                "http-error.${HttpStatus.INTERNAL_SERVER_ERROR.value()}.title", arrayOf<Any>(), any()
            )
        } returns "localized-title"
        val exception = IllegalArgumentException("test-msg")

        val response = exceptionHandler.handleException(exception, request, Locale.GERMAN)

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        val errorBody = response.body
        assertThat(errorBody?.timestamp).isNotNull()
        assertThat(errorBody?.status).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value())
        assertThat(errorBody?.error).isEqualTo("localized-title")
        assertThat(errorBody?.message).isEqualTo("test-msg")
        assertThat(errorBody?.trace).startsWith("java.lang.IllegalArgumentException: test-msg")
        assertThat(errorBody?.path).isEqualTo("/dummy-path")
    }

    @Test
    fun `handles TafelException properly`() {
        every {
            messageSource.getMessage(
                "http-error.${HttpStatus.BAD_REQUEST.value()}.title", arrayOf<Any>(), any()
            )
        } returns "localized-title"
        val exception = TafelException("tafelexception-msg")

        val response = exceptionHandler.handleTafelException(exception, request, Locale.GERMAN)

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        val errorBody = response.body
        assertThat(errorBody?.timestamp).isNotNull()
        assertThat(errorBody?.status).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(errorBody?.error).isEqualTo("localized-title")
        assertThat(errorBody?.message).isEqualTo("tafelexception-msg")
        assertThat(errorBody?.trace).startsWith("at.wrk.tafel.admin.backend.modules.base.exception.TafelException: tafelexception-msg")
        assertThat(errorBody?.path).isEqualTo("/dummy-path")
    }

    @Test
    fun `handles TafelValidationException properly`() {
        every {
            messageSource.getMessage(
                "http-error.${HttpStatus.BAD_REQUEST.value()}.title", arrayOf<Any>(), any()
            )
        } returns "localized-title"

        val exception = TafelValidationException("tafelvalidationexception-msg")
        val response = exceptionHandler.handleTafelValidationException(exception, request, Locale.GERMAN)

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        val errorBody = response.body
        assertThat(errorBody?.timestamp).isNotNull()
        assertThat(errorBody?.status).isEqualTo(HttpStatus.BAD_REQUEST.value())
        assertThat(errorBody?.error).isEqualTo("localized-title")
        assertThat(errorBody?.message).isEqualTo("tafelvalidationexception-msg")
        assertThat(errorBody?.trace).startsWith("at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException: tafelvalidationexception-msg")
        assertThat(errorBody?.path).isEqualTo("/dummy-path")
    }

}

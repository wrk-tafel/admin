package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.slf4j.LoggerFactory
import org.springframework.context.MessageSource
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.context.request.ServletWebRequest
import org.springframework.web.context.request.WebRequest
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDateTime

import java.util.*

@ControllerAdvice
class GenericExceptionHandler(
    private val messageSource: MessageSource,
    private val jsonMapper: JsonMapper,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(GenericExceptionHandler::class.java)
    }

    @ExceptionHandler(TafelException::class)
    fun handleTafelException(
        exception: TafelException, request: WebRequest, locale: Locale,
    ): ResponseEntity<Any> {
        logger.warn(exception.message, exception)

        val status = exception.status ?: HttpStatus.BAD_REQUEST
        return createErrorResponse(
            exception = exception, status = status, request = request, locale = locale
        )
    }

    @ExceptionHandler(TafelValidationException::class)
    fun handleTafelValidationException(
        exception: TafelValidationException, request: WebRequest, locale: Locale,
    ): ResponseEntity<Any> {
        logger.debug(exception.message, exception)

        val status = exception.status ?: HttpStatus.BAD_REQUEST
        return createErrorResponse(
            exception = exception, status = status, request = request, locale = locale
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleException(
        exception: Exception, request: WebRequest, locale: Locale,
    ): ResponseEntity<Any> {
        logger.error(exception.message, exception)

        return createErrorResponse(
            exception = exception, status = HttpStatus.INTERNAL_SERVER_ERROR, request = request, locale = locale
        )
    }

    private fun createErrorResponse(
        exception: Exception, status: HttpStatus, request: WebRequest, locale: Locale,
    ): ResponseEntity<Any> {
        val localizedErrorTitle: String = messageSource.getMessage(
            "http-error.${status.value()}.title", arrayOf<Any>(), locale
        )

        val error = TafelErrorResponse(
            timestamp = LocalDateTime.now(),
            status = status.value(),
            error = localizedErrorTitle,
            message = exception.message,
            trace = exception.stackTraceToString(),
            path = (request as ServletWebRequest).request.requestURI
        )

        val isSseRequest = request.getHeader("Accept")?.contains("text/event-stream") == true
        return if (isSseRequest) {
            val errorMessage = jsonMapper.writeValueAsString(error)
            ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body("event: error\ndata: $errorMessage\n\n")
        } else {
            ResponseEntity.status(status).body(error)
        }
    }

}

@ExcludeFromTestCoverage
data class TafelErrorResponse(
    val timestamp: LocalDateTime,
    val status: Int,
    val error: String,
    val message: String?,
    val trace: String?,
    val path: String?,
)

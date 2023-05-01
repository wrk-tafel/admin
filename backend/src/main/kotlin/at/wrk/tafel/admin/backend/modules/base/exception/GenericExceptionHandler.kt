package at.wrk.tafel.admin.backend.modules.base.exception

import org.springframework.context.MessageSource
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.context.request.ServletWebRequest
import org.springframework.web.context.request.WebRequest
import java.time.LocalDateTime
import java.util.*

@ControllerAdvice
class GenericExceptionHandler(
    private val messageSource: MessageSource
) {

    @ExceptionHandler(TafelException::class)
    fun handle(ex: TafelException, request: WebRequest, locale: Locale): ResponseEntity<TafelErrorResponse> {
        val errorStatus = HttpStatus.BAD_REQUEST.value()
        val localizedErrorTitle: String = messageSource.getMessage(
            "http-error.$errorStatus.title", arrayOf<Any>(), locale
        )

        val error = TafelErrorResponse(
            timestamp = LocalDateTime.now(),
            status = HttpStatus.BAD_REQUEST.value(),
            error = localizedErrorTitle,
            message = ex.message,
            path = (request as ServletWebRequest).request.requestURI
        )

        return ResponseEntity.badRequest().body(error)
    }

}

data class TafelErrorResponse(
    val timestamp: LocalDateTime,
    val status: Int,
    val error: String,
    val message: String?,
    val path: String
)

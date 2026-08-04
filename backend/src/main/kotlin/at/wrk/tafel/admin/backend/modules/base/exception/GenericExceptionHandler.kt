package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.slf4j.LoggerFactory
import org.springframework.context.MessageSource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.context.request.WebRequest
import org.springframework.web.context.request.async.AsyncRequestNotUsableException
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler
import tools.jackson.databind.json.JsonMapper

@ControllerAdvice
class GenericExceptionHandler(
    private val messageSource: MessageSource,
    private val jsonMapper: JsonMapper,
) : ResponseEntityExceptionHandler() {

    companion object {
        private val log = LoggerFactory.getLogger(GenericExceptionHandler::class.java)
    }

    /**
     * Central hook every default handler in [ResponseEntityExceptionHandler] funnels through
     * (bean-validation failures via [handleMethodArgumentNotValid], and [TafelApiException] and its
     * subclasses via the inherited `handleErrorResponseException`). Localizes the [ProblemDetail]'s
     * title and renders the response, special-casing SSE requests.
     */
    public override fun handleExceptionInternal(
        ex: Exception,
        body: Any?,
        headers: HttpHeaders,
        statusCode: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        log.debug(ex.message, ex)

        val status = HttpStatus.valueOf(statusCode.value())
        val problemDetail = (body as? ProblemDetail) ?: ProblemDetail.forStatusAndDetail(statusCode, ex.message)
        problemDetail.title = localizedTitle(status, request)

        return renderResponse(problemDetail, status, request)
    }

    public override fun handleMethodArgumentNotValid(
        ex: MethodArgumentNotValidException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val problemDetail = createProblemDetail(ex, status, "Validierung fehlgeschlagen", null, null, request)
        problemDetail.setProperty(
            "errors",
            ex.bindingResult.fieldErrors.map { FieldErrorItem(field = it.field, message = it.defaultMessage) },
        )
        return handleExceptionInternal(ex, problemDetail, headers, status, request)
    }

    /**
     * [AsyncRequestNotUsableException] means the response is already unusable (client disconnected
     * mid-stream) - it's an IOException, so Spring's own SSE completion handling
     * (`DefaultSseEmitterHandler.complete()`) catches it internally and resurfaces it as a deferred
     * result error rather than throwing it back to the calling code, which is why callers like
     * `SseOutboxService.sendEvent()` can never catch it themselves. Without this handler it falls
     * through to [handleGenericException] and gets logged as a full ERROR stack trace for what's a
     * routine disconnect. A `Unit` return here tells Spring the exception is fully handled with
     * nothing to write, since attempting to render a body onto an already-unusable response would
     * just fail again.
     */
    @ExceptionHandler(AsyncRequestNotUsableException::class)
    fun handleAsyncRequestNotUsableException(exception: AsyncRequestNotUsableException) {
        log.debug("Async request/response no longer usable, client likely disconnected", exception)
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(
        exception: Exception,
        request: WebRequest,
    ): ResponseEntity<Any> {
        log.error(exception.message, exception)

        val status = HttpStatus.INTERNAL_SERVER_ERROR
        val problemDetail = ProblemDetail.forStatusAndDetail(status, exception.message)
        problemDetail.title = localizedTitle(status, request)

        return renderResponse(problemDetail, status, request)
    }

    private fun localizedTitle(status: HttpStatus, request: WebRequest): String = messageSource.getMessage(
        "http-error.${status.value()}.title",
        arrayOf<Any>(),
        request.locale,
    )

    /**
     * If the incoming request's `Accept` header contains `text/event-stream`, a normal JSON error
     * body would not be understood by the open `EventSource` - it's written instead as an
     * `event: error` SSE frame so an in-flight SSE connection doesn't just look like it silently
     * broke.
     */
    private fun renderResponse(problemDetail: ProblemDetail, status: HttpStatus, request: WebRequest): ResponseEntity<Any> {
        val isSseRequest = request.getHeader("Accept")?.contains("text/event-stream") == true
        return if (isSseRequest) {
            val errorMessage = jsonMapper.writeValueAsString(problemDetail)
            ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body<Any>("event: error\ndata: $errorMessage\n\n")
        } else {
            ResponseEntity.status(status).body<Any>(problemDetail)
        }
    }
}

@ExcludeFromTestCoverage
data class FieldErrorItem(
    val field: String,
    val message: String?,
)

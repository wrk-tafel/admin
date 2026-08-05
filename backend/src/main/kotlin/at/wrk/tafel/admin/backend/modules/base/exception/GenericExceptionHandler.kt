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
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.ErrorResponse
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
     *
     * The `body` argument is only non-null when one of our own handlers built the [ProblemDetail]
     * itself ([handleMethodArgumentNotValid]) - every inherited handler passes `null` and expects
     * the body to be taken from the exception's own [ErrorResponse.getBody]. Falling straight
     * through to `ex.message` instead is why a [TafelApiException] used to render its detail as the
     * exception's `toString()` (`"400 BAD_REQUEST, ProblemDetail[type='null', ...]"`) rather than
     * the message it was constructed with. Note the existing unit tests never caught that: they
     * pass `exception.body` explicitly, which production never does.
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
        val problemDetail = (body as? ProblemDetail)
            ?: (ex as? ErrorResponse)?.body
            ?: ProblemDetail.forStatusAndDetail(statusCode, ex.message)
        problemDetail.title = localizedTitle(status, request)

        return renderResponse(problemDetail, status, request)
    }

    /**
     * Without this, an [AccessDeniedException] raised by method security (`@PreAuthorize`) inside a
     * controller invocation falls through to [handleGenericException] and is answered with a **500**
     * plus a full ERROR stack trace - a permission problem reported as a server fault, which the SPA
     * cannot tell the user anything useful about.
     *
     * Only *method-security* denials reach here. A denial raised in the filter chain (most commonly
     * a CSRF-token failure) never reaches an `@ControllerAdvice` at all - it is answered by
     * `TafelAccessDeniedHandler` instead. That split matters when reading logs: a 403 that appears
     * *without* the WARN this handler logs did not come from `@PreAuthorize`. See issue #2989.
     *
     * A request that isn't authenticated at all never gets this far - `TafelJwtAuthenticationFilter`
     * already answers it with a 401 - so a denial here always means an authenticated user lacking an
     * authority, and 403 (rather than deferring to an authentication entry point) is the right answer.
     */
    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDeniedException(
        exception: AccessDeniedException,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val authentication = SecurityContextHolder.getContext().authentication
        log.warn(
            "Access denied for user '{}' on {} - resolved authorities: [{}] - {}",
            authentication?.name ?: "anonymous",
            request.getDescription(false),
            authentication?.authorities?.joinToString(", ") { it.authority ?: "?" } ?: "none",
            exception.message,
        )

        val status = HttpStatus.FORBIDDEN
        // the raw exception message ("Access Denied") is English and says nothing a user can act
        // on - it stays in the log above, while the response carries the German wording the SPA
        // already used as its own 403 fallback
        val problemDetail = ProblemDetail.forStatusAndDetail(status, "Zugriff nicht erlaubt!")
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
     * `SseOutboxService.sendEvent()` can never catch it themselves. Without overriding this it falls
     * through to [handleGenericException] and gets logged as a full ERROR stack trace for what's a
     * routine disconnect.
     *
     * This overrides the protected hook [ResponseEntityExceptionHandler.handleAsyncRequestNotUsableException]
     * rather than adding a new `@ExceptionHandler(AsyncRequestNotUsableException::class)` method: the
     * superclass's own `handleException` already declares that exact exception type in its
     * `@ExceptionHandler` list (since Spring Framework 6.2) and dispatches to this hook internally -
     * a second method independently claiming the same type is an "Ambiguous @ExceptionHandler method"
     * error at context startup, not a silent override. Returning `null` (the default) tells Spring the
     * exception is fully handled with nothing to write, since attempting to render a body onto an
     * already-unusable response would just fail again.
     */
    public override fun handleAsyncRequestNotUsableException(
        ex: AsyncRequestNotUsableException,
        request: WebRequest,
    ): ResponseEntity<Any>? {
        log.debug("Async request/response no longer usable, client likely disconnected", ex)
        return null
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

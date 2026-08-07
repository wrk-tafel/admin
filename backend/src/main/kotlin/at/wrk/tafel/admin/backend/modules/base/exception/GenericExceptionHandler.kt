package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.sanitizeForLog
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
import org.springframework.web.context.request.ServletWebRequest
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

        private val NO_MESSAGE_ARGS = arrayOf<Any>()
        private const val DEFAULT_TITLE_CODE = "http-error.default.title"
        private const val DEFAULT_DETAIL_CODE = "http-error.default.detail"
        private const val LAST_RESORT_TITLE = "Fehler"
        private const val LAST_RESORT_DETAIL = "Es ist ein unerwarteter Fehler aufgetreten."
    }

    /**
     * Central hook every default handler in [ResponseEntityExceptionHandler] funnels through
     * (bean-validation failures via [handleMethodArgumentNotValid], and [TafelApiException] and its
     * subclasses via the inherited `handleErrorResponseException`). Localizes the [ProblemDetail]'s
     * title and detail and renders the response, special-casing SSE requests.
     *
     * The `body` argument is non-null both when one of our own handlers built the [ProblemDetail]
     * itself ([handleMethodArgumentNotValid]) and when an inherited handler built one via
     * `createProblemDetail` (e.g. `handleHttpMessageNotReadable`); the remaining inherited handlers
     * pass `null` and expect the body to be taken from the exception's own [ErrorResponse.getBody].
     * Falling straight through to `ex.message` instead is why a [TafelApiException] used to render
     * its detail as the exception's `toString()` (`"400 BAD_REQUEST, ProblemDetail[type='null',
     * ...]"`) rather than the message it was constructed with. Note the existing unit tests never
     * caught that: they pass `exception.body` explicitly, which production never does.
     *
     * Every exception reaching this hook is logged at `warn` (not `debug`) so it's actually visible
     * in production, where `logging.level.root` is `INFO` - before this, every 4xx handled here
     * (business-rule violations, validation failures, malformed requests) was silently swallowed.
     * Logged in the same "<METHOD> <uri>" shape as [handleAccessDeniedException] so both denial paths
     * can be grepped together; no stack trace, since every exception classified here is an expected,
     * already-categorized failure - an unexpected one goes through [handleGenericException] instead.
     */
    public override fun handleExceptionInternal(
        ex: Exception,
        body: Any?,
        headers: HttpHeaders,
        statusCode: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        log.warn(
            "{} {} answered with {} ({}): {}",
            sanitizeForLog((request as? ServletWebRequest)?.request?.method ?: "?"),
            sanitizeForLog(request.getDescription(false)),
            statusCode.value(),
            ex::class.simpleName,
            sanitizeForLog(ex.message),
        )

        val status = HttpStatus.valueOf(statusCode.value())
        val problemDetail = (body as? ProblemDetail)
            ?: (ex as? ErrorResponse)?.body
            ?: ProblemDetail.forStatus(statusCode)
        if (!carriesOwnDetail(ex)) {
            problemDetail.detail = localizedDetail(status, request)
        }
        problemDetail.title = localizedTitle(status, request)

        return renderResponse(problemDetail, status, request)
    }

    /**
     * Whether [ex]'s [ProblemDetail] already carries a German, user-readable detail authored by this
     * application, which must therefore survive the generic substitution in
     * [handleExceptionInternal]: a [TafelApiException] carries the message passed at its throw site,
     * and a [MethodArgumentNotValidException] is answered by [handleMethodArgumentNotValid] with its
     * own wording. Everything else reaching that hook is one of Spring's built-in MVC exceptions,
     * whose detail is English and phrased in terms of framework internals ("Failed to read request",
     * "Invalid request content.") - or, before #3008, the unresolved `problemDetail.<exception class>`
     * message *code*, because `MessageConfig` had `useCodeAsDefaultMessage` enabled. Neither is
     * something the SPA should put in front of a user, and the full exception is logged above anyway.
     */
    private fun carriesOwnDetail(ex: Exception): Boolean = ex is TafelApiException || ex is MethodArgumentNotValidException

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
        // logged in the same "<METHOD> <uri>" shape as TafelAccessDeniedHandler, so the two denial
        // paths can be grepped together - getDescription() alone omits the method, which matters
        // when the same path allows GET but denies POST
        log.warn(
            "Access denied for user '{}' on {} {} - resolved authorities: [{}] - {}",
            sanitizeForLog(authentication?.name ?: "anonymous"),
            sanitizeForLog((request as? ServletWebRequest)?.request?.method ?: "?"),
            sanitizeForLog(request.getDescription(false)),
            sanitizeForLog(authentication?.authorities?.joinToString(", ") { it.authority ?: "?" } ?: "none"),
            sanitizeForLog(exception.message),
        )

        val status = HttpStatus.FORBIDDEN
        // the raw exception message ("Access Denied") is English and says nothing a user can act
        // on - it stays in the log above, while the response carries the German wording the SPA
        // already used as its own 403 fallback (kept identical in http-error.403.detail, so the
        // user sees the same sentence whichever of the two produced it)
        val problemDetail = ProblemDetail.forStatusAndDetail(status, localizedDetail(status, request))
        problemDetail.title = localizedTitle(status, request)

        return renderResponse(problemDetail, status, request)
    }

    /**
     * Builds the [ProblemDetail] directly rather than via the inherited `createProblemDetail`: that
     * helper's only added value is a `MessageSource` lookup of the optional
     * `problemDetail.org.springframework.web.bind.MethodArgumentNotValidException` code, which this
     * app doesn't configure - and which, while `useCodeAsDefaultMessage` was enabled, resolved to the
     * code itself and so *overwrote* the German detail passed here (see #3008).
     */
    public override fun handleMethodArgumentNotValid(
        ex: MethodArgumentNotValidException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val problemDetail = ProblemDetail.forStatusAndDetail(status, "Validierung fehlgeschlagen")
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

    /**
     * The exception's own `message` is deliberately not used as the response detail: for an unexpected
     * failure that's raw internal text (a stack-trace-flavoured JPA/Jackson message, sometimes
     * carrying query or payload fragments), and the SPA puts `detail` straight into an error toast.
     * It's logged in full at `error` here instead.
     */
    @ExceptionHandler(Exception::class)
    fun handleGenericException(
        exception: Exception,
        request: WebRequest,
    ): ResponseEntity<Any> {
        log.error(exception.message, exception)

        val status = HttpStatus.INTERNAL_SERVER_ERROR
        val problemDetail = ProblemDetail.forStatusAndDetail(status, localizedDetail(status, request))
        problemDetail.title = localizedTitle(status, request)

        return renderResponse(problemDetail, status, request)
    }

    private fun localizedTitle(status: HttpStatus, request: WebRequest): String = localizedMessage(
        code = "http-error.${status.value()}.title",
        defaultCode = DEFAULT_TITLE_CODE,
        lastResort = LAST_RESORT_TITLE,
        request = request,
    )

    private fun localizedDetail(status: HttpStatus, request: WebRequest): String = localizedMessage(
        code = "http-error.${status.value()}.detail",
        defaultCode = DEFAULT_DETAIL_CODE,
        lastResort = LAST_RESORT_DETAIL,
        request = request,
    )

    /**
     * Resolves [code], falling back to [defaultCode] for a status without an entry of its own (405,
     * 415 and friends only ever come from Spring's built-in handlers, so it's easy for one to appear
     * without anybody adding a key for it).
     *
     * Both lookups pass a `null` default message rather than using the throwing `getMessage` overload:
     * a `NoSuchMessageException` raised *inside* the exception handler would replace a well-formed
     * error response with a bare 500, which is exactly the failure mode
     * `MessageSource.useCodeAsDefaultMessage` used to hide - at the cost of leaking the key itself into
     * the response (see [at.wrk.tafel.admin.backend.config.MessageConfig] and issue #3008). Hence
     * [lastResort] as the final layer.
     */
    private fun localizedMessage(code: String, defaultCode: String, lastResort: String, request: WebRequest): String {
        val resolved = messageSource.getMessage(code, NO_MESSAGE_ARGS, null, request.locale)
            ?: messageSource.getMessage(defaultCode, NO_MESSAGE_ARGS, null, request.locale)
        return resolved ?: lastResort
    }

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

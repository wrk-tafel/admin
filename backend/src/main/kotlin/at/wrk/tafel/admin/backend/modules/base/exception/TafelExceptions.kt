package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.ProblemDetail
import org.springframework.web.ErrorResponseException

/**
 * Base for all Tafel-specific API exceptions. Each subclass fixes its own [HttpStatusCode] in its
 * constructor, so - unlike the old `TafelException`/`TafelValidationException` with an optional
 * `status` defaulting to 400 - the correct status can no longer be forgotten at a throw site.
 * [GenericExceptionHandler] renders the carried [ProblemDetail] as the response body (RFC 7807).
 */
@ExcludeFromTestCoverage
open class TafelApiException(
    status: HttpStatusCode,
    detail: String,
    cause: Throwable? = null,
) : ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), cause)

/**
 * The addressed resource (typically looked up by an id from the request path) doesn't exist.
 */
@ExcludeFromTestCoverage
class NotFoundException(
    detail: String,
    cause: Throwable? = null,
) : TafelApiException(HttpStatus.NOT_FOUND, detail, cause)

/**
 * The request conflicts with the current state of a resource (duplicate/already exists, an
 * in-progress operation on the same resource, etc.).
 */
@ExcludeFromTestCoverage
class ConflictException(
    detail: String,
    cause: Throwable? = null,
) : TafelApiException(HttpStatus.CONFLICT, detail, cause)

/**
 * A business-rule violation not covered by [NotFoundException]/[ConflictException] - e.g. invalid
 * references inside a request body, or a precondition failure. Defaults to 400, but callers can
 * pass a different status (e.g. 422) when that fits better.
 */
@ExcludeFromTestCoverage
class BusinessRuleException(
    detail: String,
    status: HttpStatusCode = HttpStatus.BAD_REQUEST,
    cause: Throwable? = null,
) : TafelApiException(status, detail, cause)

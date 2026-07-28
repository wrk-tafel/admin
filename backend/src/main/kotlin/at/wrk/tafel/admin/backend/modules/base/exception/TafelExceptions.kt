package at.wrk.tafel.admin.backend.modules.base.exception

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.http.HttpStatus

/**
 * Signals an unexpected/internal failure (e.g. a downstream dependency misbehaving).
 *
 * Structurally identical to [TafelValidationException] - both carry an optional [status]
 * ([GenericExceptionHandler] defaults to [org.springframework.http.HttpStatus.BAD_REQUEST] when
 * null). The distinction is intent/log severity only: [GenericExceptionHandler] logs this one at
 * `warn`, not the expected-failure `debug` level used for [TafelValidationException].
 */
@ExcludeFromTestCoverage
class TafelException(
    override val message: String?,
    override val cause: Throwable? = null,
    val status: HttpStatus? = null,
) : RuntimeException()

/**
 * Signals an expected, user-facing business-rule violation (e.g. "Ticketnummer bereits
 * vergeben!"). See [TafelException] for how the two differ - only in the log level
 * [GenericExceptionHandler] uses for them.
 */
@ExcludeFromTestCoverage
class TafelValidationException(
    override val message: String?,
    override val cause: Throwable? = null,
    val status: HttpStatus? = null,
) : RuntimeException()

package at.wrk.tafel.admin.backend.modules.support.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * One client-side error, reported by the browser as it happens rather than waiting for a user to
 * notice it and write a support request - see `ClientErrorLogService`. The fields mirror
 * [SupportClientContext]'s `page`/`userAgent`/`recentErrors` entry shape, kept intentionally small:
 * no screenshot and no stack trace, since this goes out automatically instead of behind an explicit
 * "send" action.
 */
data class ClientErrorReportRequest(
    @field:NotBlank
    @field:Size(max = 1000)
    val message: String,
    @field:Size(max = 500)
    val page: String? = null,
    @field:Size(max = 500)
    val userAgent: String? = null,
)

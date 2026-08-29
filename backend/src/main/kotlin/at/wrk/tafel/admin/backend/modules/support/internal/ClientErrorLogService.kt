package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.modules.support.model.ClientErrorReportRequest
import org.slf4j.LoggerFactory
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

/**
 * Puts a client-side error into `app.log` the moment it happens, instead of it only ever surfacing
 * as an attachment on a support mail someone chose to write (issue #3512). A dedicated logger name
 * is what makes these greppable/alertable on separately from the rest of `app.log`'s WARN traffic.
 *
 * Every field is a free-form browser string, same as [at.wrk.tafel.admin.backend.modules.support.model.SupportClientContext] - `sanitizeForLog`
 * strips the newlines that would otherwise let one client error forge extra-looking log lines.
 */
@Service
class ClientErrorLogService {

    companion object {
        private val log = LoggerFactory.getLogger("at.wrk.tafel.admin.backend.CLIENT_ERROR")
    }

    fun record(request: ClientErrorReportRequest) {
        val username = SecurityContextHolder.getContext().authentication?.name ?: "unbekannt"

        log.warn(
            "Client-Fehler von Benutzer '{}' auf Seite '{}' ({}): {}",
            sanitizeForLog(username),
            sanitizeForLog(request.page ?: "unbekannt"),
            sanitizeForLog(request.userAgent ?: "unbekannt"),
            sanitizeForLog(request.message),
        )
    }
}

package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientContext
import at.wrk.tafel.admin.backend.modules.support.model.SupportRequest
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val REPORTED_AT_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")

@Service
class SupportService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailSenderService: MailSenderService,
    private val clock: Clock,
) {

    fun sendSupportRequest(request: SupportRequest) {
        val recipients = tafelAdminProperties.support?.recipients
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?: emptyList()

        if (recipients.isEmpty()) {
            throw TafelApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Support-Kontakt ist nicht konfiguriert")
        }

        val context = Context()
        context.setVariable("supportTitle", request.title)
        context.setVariable("supportText", request.text)
        context.setVariable("diagnostics", collectDiagnostics(request.clientContext))

        mailSenderService.sendHtmlMailTo(
            recipients = recipients,
            subject = "Support-Anfrage: ${request.title}",
            templateName = "mails/support-request-mail",
            context = context,
        )
    }

    /**
     * The context a report is worth far more with than without, and that a user can neither be
     * expected to know nor to type: who reported it and when, which build they were looking at, and
     * what their browser had to say for itself. Assembled here rather than trusted wholesale from
     * the client - the reporter, the time and the running version are facts the server holds, and
     * only the browser-side half comes from the request.
     */
    private fun collectDiagnostics(clientContext: SupportClientContext?) = SupportDiagnostics(
        username = SecurityContextHolder.getContext().authentication?.name ?: "unbekannt",
        reportedAt = LocalDateTime.now(clock).format(REPORTED_AT_FORMATTER),
        version = tafelAdminProperties.version,
        buildTime = tafelAdminProperties.buildTime,
        environmentLabel = tafelAdminProperties.environmentLabel.ifBlank { "PROD" },
        page = clientContext?.page.orUnknown(),
        userAgent = clientContext?.userAgent.orUnknown(),
        viewport = clientContext?.viewport.orUnknown(),
        screen = clientContext?.screen.orUnknown(),
        language = clientContext?.language.orUnknown(),
        timeZone = clientContext?.timeZone.orUnknown(),
        recentErrors = clientContext?.recentErrors
            ?.map { SupportDiagnosticsError(timestamp = it.timestamp.orUnknown(), message = it.message.orUnknown()) }
            ?: emptyList(),
    )

    // A missing value is spelled out rather than left blank - an empty line in the mail reads as an
    // oversight, "unbekannt" reads as what it is: the browser didn't tell us.
    private fun String?.orUnknown() = if (isNullOrBlank()) "unbekannt" else this
}

data class SupportDiagnostics(
    val username: String,
    val reportedAt: String,
    val version: String,
    val buildTime: String,
    val environmentLabel: String,
    val page: String,
    val userAgent: String,
    val viewport: String,
    val screen: String,
    val language: String,
    val timeZone: String,
    val recentErrors: List<SupportDiagnosticsError>,
)

data class SupportDiagnosticsError(
    val timestamp: String,
    val message: String,
)

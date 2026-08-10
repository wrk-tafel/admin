package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.support.model.SupportClientContext
import at.wrk.tafel.admin.backend.modules.support.model.SupportRequest
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.thymeleaf.context.Context
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Base64

private val REPORTED_AT_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")
private const val SCREENSHOT_DATA_URL_PREFIX = "data:image/jpeg;base64,"
private val logger = LoggerFactory.getLogger(SupportService::class.java)

@Service
class SupportService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailSenderService: MailSenderService,
    private val clock: Clock,
) {

    fun sendSupportRequest(request: SupportRequest) {
        val supportProperties = tafelAdminProperties.support
        val recipients = supportProperties?.recipients
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?: emptyList()

        if (recipients.isEmpty()) {
            throw TafelApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Support-Kontakt ist nicht konfiguriert")
        }

        val screenshot = decodeScreenshot(request.clientContext?.screenshot)

        val context = Context()
        context.setVariable("supportTitle", request.title)
        context.setVariable("supportText", request.text)
        context.setVariable("diagnostics", collectDiagnostics(request.clientContext, screenshot != null))

        mailSenderService.sendHtmlMailTo(
            recipients = recipients,
            subject = subjectPrefix(supportProperties?.subjectPrefix) + "Support-Anfrage: ${request.title}",
            attachments = listOfNotNull(screenshot),
            templateName = "mails/support-request-mail",
            context = context,
        )
    }

    // The configured prefix, with the separating space it needs and without the leading blank an
    // unset one would otherwise put in front of every subject.
    private fun subjectPrefix(configuredPrefix: String?) = if (configuredPrefix.isNullOrBlank()) "" else "${configuredPrefix.trim()} "

    /**
     * The screenshot the browser took of the page the report is about, as a mail attachment.
     *
     * A screenshot that cannot be decoded costs the report its picture, never the report itself -
     * so anything unexpected here is dropped rather than thrown: it is the one part of the request
     * that is a best-effort extra.
     */
    private fun decodeScreenshot(dataUrl: String?): MailAttachment? {
        val base64 = dataUrl?.removePrefix(SCREENSHOT_DATA_URL_PREFIX)?.takeIf { it != dataUrl }
            ?: return null

        val bytes = try {
            Base64.getDecoder().decode(base64)
        } catch (e: IllegalArgumentException) {
            logger.warn("Screenshot of a support request could not be decoded and was left out", e)
            return null
        }

        return MailAttachment(
            filename = "screenshot.jpg",
            inputStreamSource = ByteArrayResource(bytes),
            contentType = MediaType.IMAGE_JPEG_VALUE,
        )
    }

    /**
     * The context a report is worth far more with than without, and that a user can neither be
     * expected to know nor to type: who reported it and when, which build they were looking at, and
     * what their browser had to say for itself. Assembled here rather than trusted wholesale from
     * the client - the reporter, the time and the running version are facts the server holds, and
     * only the browser-side half comes from the request.
     */
    private fun collectDiagnostics(clientContext: SupportClientContext?, screenshotAttached: Boolean) = SupportDiagnostics(
        screenshotAttached = screenshotAttached,
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
    val screenshotAttached: Boolean,
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

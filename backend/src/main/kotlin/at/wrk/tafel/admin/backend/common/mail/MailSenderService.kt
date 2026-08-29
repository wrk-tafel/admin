package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxService
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import jakarta.mail.Session
import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.InputStreamSource
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.util.Properties

/**
 * Composes the application's mails. Sending them is [MailOutboxService]'s job - see its class
 * comment for why an SMTP call has no business inside a transaction that just changed something.
 *
 * It holds no [org.springframework.mail.javamail.JavaMailSender]: composing a message needs a
 * `Session` only as the object a [MimeMessage] hangs off, and the session that matters is the
 * configured one the outbox re-reads the stored bytes with when it actually sends. Whether a mail
 * server exists at all is one question, asked in one place - [MailOutboxService.enqueue].
 */
@Service
class MailSenderService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailRecipientRepository: MailRecipientRepository,
    private val templateEngine: TemplateEngine,
    private val mailOutboxService: MailOutboxService,
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MailSenderService::class.java)

        // Only ever the container for a message being built - never used to talk to a server.
        private val COMPOSE_SESSION: Session = Session.getInstance(Properties())
    }

    fun sendTextMail(
        mailType: MailType,
        subject: String,
        content: String,
        attachments: List<MailAttachment> = emptyList(),
    ) {
        sendMail(resolveRecipients(mailType), mailType.outboxLabel, subject, content, attachments, isHtmlMail = false)
    }

    fun sendHtmlMail(
        mailType: MailType,
        subject: String,
        attachments: List<MailAttachment> = emptyList(),
        templateName: String,
        context: Context,
    ) {
        sendMail(resolveRecipients(mailType), mailType.outboxLabel, subject, renderHtml(templateName, context), attachments, isHtmlMail = true)
    }

    /**
     * Same as [sendHtmlMail], but for a mail whose recipients come from the deployment's
     * configuration rather than from the `mail_recipients` table maintained in the UI - used by the
     * support contact, which has to keep working when the application itself is what's broken. It
     * has no [MailType] of its own to derive a label from, so the caller names it directly.
     */
    fun sendHtmlMailTo(
        mailType: String,
        recipients: List<String>,
        subject: String,
        attachments: List<MailAttachment> = emptyList(),
        templateName: String,
        context: Context,
    ) {
        val to = recipients.map { MailRecipient(address = it, recipientType = RecipientType.TO) }
        sendMail(to, mailType, subject, renderHtml(templateName, context), attachments, isHtmlMail = true)
    }

    private fun renderHtml(templateName: String, context: Context): String {
        context.setVariable("subTemplate", templateName)
        return templateEngine.process("mail-layout", context)
    }

    /**
     * Composes the mail and hands it to the outbox - it leaves the building later, from
     * [MailOutboxService], not from the transaction that asked for it.
     *
     * Read once so one mail is composed from one consistent set of settings - the properties are
     * re-bound in place when the config file changes (see `ConfigFileReloadService`), and re-reading
     * per line could straddle a reload. `tafeladmin.mail` unset means there is nobody to send *from*,
     * which is the normal state of a dev environment; the mail is skipped rather than failing, so
     * callers don't have to guard every call site against a missing mail configuration. A deployment
     * that configures a mail server is required to set it (see `application.yml`).
     */
    private fun sendMail(
        recipients: List<MailRecipient>,
        mailType: String,
        subject: String,
        content: String,
        attachments: List<MailAttachment>,
        isHtmlMail: Boolean = false,
    ) {
        val mailProperties = tafelAdminProperties.mail
        if (mailProperties == null) {
            logger.debug("Mail '{}' skipped - tafeladmin.mail is not configured", subject)
            return
        }

        val messageHelper = MimeMessageHelper(MimeMessage(COMPOSE_SESSION), true, "UTF-8")

        val configuredPrefix = mailProperties.subjectPrefix
        val subjectPrefix = if (configuredPrefix.isNullOrBlank()) "" else "$configuredPrefix "
        val fullSubject = subjectPrefix + subject
        messageHelper.setSubject(fullSubject)
        messageHelper.setText(content, isHtmlMail)

        messageHelper.setFrom(mailProperties.from)
        addRecipientAddresses(recipients, messageHelper)
        mailProperties.defaultRecipientsBcc?.forEach { messageHelper.addBcc(it) }

        attachments.forEach {
            messageHelper.addAttachment(it.filename, it.inputStreamSource, it.contentType)
        }

        messageHelper.addInline("logo", ClassPathResource("/assets/logo.png"))

        mailOutboxService.enqueue(
            mimeMessage = messageHelper.mimeMessage,
            mailType = mailType,
            subject = fullSubject,
            recipients = recipients.map { it.address },
        )
    }

    private fun resolveRecipients(mailType: MailType): List<MailRecipient> = mailRecipientRepository.findAllByMailType(mailType)
        .map { MailRecipient(address = it.address, recipientType = it.recipientType) }

    // Purely a display label for a failed-delivery notification (MailDeliveryFailedEvent) - matches
    // the wording used elsewhere for the same three mails (see the settings module's mail-recipients
    // screen and ReportMailFailedEvent.reportName), so a mail type reads the same wherever it shows up.
    private val MailType.outboxLabel: String
        get() = when (this) {
            MailType.DAILY_REPORT -> "Tagesreport"
            MailType.STATISTICS -> "Statistiken"
            MailType.RETURN_BOXES -> "Retourkisten"
        }

    private fun addRecipientAddresses(recipients: List<MailRecipient>, messageHelper: MimeMessageHelper) {
        recipients.filter { it.recipientType == RecipientType.TO }
            .forEach { messageHelper.addTo(it.address) }
        recipients.filter { it.recipientType == RecipientType.CC }
            .forEach { messageHelper.addCc(it.address) }
        recipients.filter { it.recipientType == RecipientType.BCC }
            .forEach { messageHelper.addBcc(it.address) }
    }
}

@ExcludeFromTestCoverage
data class MailRecipient(
    val address: String,
    val recipientType: RecipientType,
)

@ExcludeFromTestCoverage
data class MailAttachment(
    val filename: String,
    val inputStreamSource: InputStreamSource,
    val contentType: String,
)

package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxService
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.InputStreamSource
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context

/**
 * Composes the application's mails. Sending them is [MailOutboxService]'s job - see its class
 * comment for why an SMTP call has no business inside a transaction that just changed something.
 */
@Service
class MailSenderService(
    @param:Autowired(required = false)
    private val mailSender: JavaMailSender?,
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailRecipientRepository: MailRecipientRepository,
    private val templateEngine: TemplateEngine,
    private val mailOutboxService: MailOutboxService,
) {

    fun sendTextMail(
        mailType: MailType,
        subject: String,
        content: String,
        attachments: List<MailAttachment> = emptyList(),
    ) {
        sendMail(resolveRecipients(mailType), subject, content, attachments, isHtmlMail = false)
    }

    fun sendHtmlMail(
        mailType: MailType,
        subject: String,
        attachments: List<MailAttachment> = emptyList(),
        templateName: String,
        context: Context,
    ) {
        sendMail(resolveRecipients(mailType), subject, renderHtml(templateName, context), attachments, isHtmlMail = true)
    }

    /**
     * Same as [sendHtmlMail], but for a mail whose recipients come from the deployment's
     * configuration rather than from the `mail_recipients` table maintained in the UI - used by the
     * support contact, which has to keep working when the application itself is what's broken.
     */
    fun sendHtmlMailTo(
        recipients: List<String>,
        subject: String,
        attachments: List<MailAttachment> = emptyList(),
        templateName: String,
        context: Context,
    ) {
        val to = recipients.map { MailRecipient(address = it, recipientType = RecipientType.TO) }
        sendMail(to, subject, renderHtml(templateName, context), attachments, isHtmlMail = true)
    }

    private fun renderHtml(templateName: String, context: Context): String {
        context.setVariable("subTemplate", templateName)
        return templateEngine.process("mail-layout", context)
    }

    /**
     * Composes the mail and hands it to the outbox - it leaves the building later, from
     * [MailOutboxService], not from the transaction that asked for it.
     *
     * `mailSender` is `@Autowired(required = false)` - when no mail server is configured (e.g.
     * dev/test profiles), this silently no-ops instead of failing, so callers don't need to guard
     * every mail-sending call site against a missing mail configuration. Nothing is queued in that
     * case either: with no server to send it to, a queued mail would only pile up.
     */
    private fun sendMail(
        recipients: List<MailRecipient>,
        subject: String,
        content: String,
        attachments: List<MailAttachment>,
        isHtmlMail: Boolean = false,
    ) {
        if (mailSender != null) {
            val messageHelper = MimeMessageHelper(mailSender.createMimeMessage(), true)

            // Read once so one mail is composed from one consistent set of settings - the
            // properties are re-bound in place when the config file changes (see
            // ConfigFileReloadService), and re-reading per line could straddle a reload.
            val mailProperties = tafelAdminProperties.mail

            val configuredPrefix = mailProperties?.subjectPrefix
            val subjectPrefix = if (configuredPrefix.isNullOrBlank()) "" else "$configuredPrefix "
            val fullSubject = subjectPrefix + subject
            messageHelper.setSubject(fullSubject)
            messageHelper.setText(content, isHtmlMail)

            messageHelper.setFrom(mailProperties!!.from)
            addRecipientAddresses(recipients, messageHelper)
            mailProperties.defaultRecipientsBcc?.forEach { messageHelper.addBcc(it) }

            attachments.forEach {
                messageHelper.addAttachment(it.filename, it.inputStreamSource, it.contentType)
            }

            messageHelper.addInline("logo", ClassPathResource("/assets/logo.png"))

            mailOutboxService.enqueue(
                mimeMessage = messageHelper.mimeMessage,
                subject = fullSubject,
                recipients = recipients.map { it.address },
            )
        }
    }

    private fun resolveRecipients(mailType: MailType): List<MailRecipient> = mailRecipientRepository.findAllByMailType(mailType)
        .map { MailRecipient(address = it.address, recipientType = it.recipientType) }

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

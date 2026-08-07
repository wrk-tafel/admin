package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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

@Service
class MailSenderService(
    @param:Autowired(required = false)
    private val mailSender: JavaMailSender?,
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailRecipientRepository: MailRecipientRepository,
    private val templateEngine: TemplateEngine,
) {

    fun sendTextMail(
        mailType: MailType,
        subject: String,
        content: String,
        attachments: List<MailAttachment> = emptyList(),
    ) {
        sendMail(mailType, subject, content, attachments, isHtmlMail = false)
    }

    fun sendHtmlMail(
        mailType: MailType,
        subject: String,
        attachments: List<MailAttachment> = emptyList(),
        templateName: String,
        context: Context,
    ) {
        context.setVariable("subTemplate", templateName)
        val content = templateEngine.process("mail-layout", context)

        sendMail(mailType, subject, content, attachments, isHtmlMail = true)
    }

    /**
     * `mailSender` is `@Autowired(required = false)` - when no mail server is configured (e.g.
     * dev/test profiles), this silently no-ops instead of failing, so callers don't need to guard
     * every mail-sending call site against a missing mail configuration.
     */
    private fun sendMail(
        mailType: MailType,
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
            messageHelper.setSubject(subjectPrefix + subject)
            messageHelper.setText(content, isHtmlMail)

            messageHelper.setFrom(mailProperties!!.from)
            configureRecipientAddresses(mailType, messageHelper)
            mailProperties.defaultRecipientsBcc?.forEach { messageHelper.addBcc(it) }

            attachments.forEach {
                messageHelper.addAttachment(it.filename, it.inputStreamSource, it.contentType)
            }

            messageHelper.addInline("logo", ClassPathResource("/assets/logo.png"))

            mailSender.send(messageHelper.mimeMessage)
        }
    }

    private fun configureRecipientAddresses(mailType: MailType, messageHelper: MimeMessageHelper) {
        val mailAddresses = mailRecipientRepository.findAllByMailType(mailType)

        mailAddresses.filter { it.recipientType == RecipientType.TO }
            .forEach { messageHelper.addTo(it.address) }
        mailAddresses.filter { it.recipientType == RecipientType.CC }
            .forEach { messageHelper.addCc(it.address) }
        mailAddresses.filter { it.recipientType == RecipientType.BCC }
            .forEach { messageHelper.addBcc(it.address) }
    }
}

@ExcludeFromTestCoverage
data class MailAttachment(
    val filename: String,
    val inputStreamSource: InputStreamSource,
    val contentType: String,
)

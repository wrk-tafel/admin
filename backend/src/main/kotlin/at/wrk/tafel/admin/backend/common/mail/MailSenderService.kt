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
    @Autowired(required = false)
    private val mailSender: JavaMailSender?,
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailRecipientRepository: MailRecipientRepository,
    private val templateEngine: TemplateEngine,
) {

    fun sendTextMail(
        mailType: MailType,
        subject: String,
        content: String,
        attachments: List<MailAttachment>,
    ) {
        sendMail(mailType, subject, content, attachments, isHtmlMail = false)
    }

    fun sendHtmlMail(
        mailType: MailType,
        subject: String,
        attachments: List<MailAttachment>,
        templateName: String,
        context: Context,
    ) {
        context.setVariable("subTemplate", templateName)
        val content = templateEngine.process("mail-layout", context)

        sendMail(mailType, subject, content, attachments, isHtmlMail = true)
    }

    private fun sendMail(
        mailType: MailType,
        subject: String,
        content: String,
        attachments: List<MailAttachment>,
        isHtmlMail: Boolean = false,
    ) {
        if (mailSender != null) {
            val messageHelper = MimeMessageHelper(mailSender.createMimeMessage(), true)

            val subjectPrefix = tafelAdminProperties.mail?.subjectPrefix ?: ""
            messageHelper.setSubject(subjectPrefix + subject)
            messageHelper.setText(content, isHtmlMail)

            messageHelper.setFrom(tafelAdminProperties.mail!!.from)
            configureRecipientAddresses(mailType, messageHelper)

            attachments.forEach {
                messageHelper.addAttachment(it.filename, it.inputStreamSource, it.contentType)
            }

            messageHelper.addInline("toet-logo", ClassPathResource("mail-templates/assets/toet-logo.png"))

            mailSender.send(messageHelper.mimeMessage)
        }
    }

    private fun configureRecipientAddresses(mailType: MailType, messageHelper: MimeMessageHelper) {
        val mailAddresses = mailRecipientRepository.findAllByMailType(mailType)

        mailAddresses.filter { it.recipientType == RecipientType.TO }
            .forEach { messageHelper.addTo(it.address!!) }
        mailAddresses.filter { it.recipientType == RecipientType.CC }
            .forEach { messageHelper.addCc(it.address!!) }
        mailAddresses.filter { it.recipientType == RecipientType.BCC }
            .forEach { messageHelper.addBcc(it.address!!) }
    }

}

@ExcludeFromTestCoverage
data class MailAttachment(
    val filename: String,
    val inputStreamSource: InputStreamSource,
    val contentType: String,
)

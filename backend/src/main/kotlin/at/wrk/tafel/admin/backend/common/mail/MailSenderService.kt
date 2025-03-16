package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailRecipientAddressesProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
    private val templateEngine: TemplateEngine,
) {

    fun sendTextMail(
        recipientAddresses: TafelAdminMailRecipientAddressesProperties,
        subject: String,
        content: String,
        attachments: List<MailAttachment>,
    ) {
        sendMail(recipientAddresses, subject, content, attachments, isHtmlMail = false)
    }

    fun sendHtmlMail(
        recipientAddresses: TafelAdminMailRecipientAddressesProperties,
        subject: String,
        attachments: List<MailAttachment>,
        templateName: String,
        context: Context,
    ) {
        context.setVariable("subTemplate", templateName)
        val content = templateEngine.process("mail-layout", context)

        sendMail(recipientAddresses, subject, content, attachments, isHtmlMail = true)
    }

    private fun sendMail(
        recipientAddresses: TafelAdminMailRecipientAddressesProperties,
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
            recipientAddresses.to?.forEach {
                messageHelper.addTo(it)
            }
            recipientAddresses.cc?.forEach {
                messageHelper.addCc(it)
            }
            recipientAddresses.bcc?.forEach {
                messageHelper.addBcc(it)
            }
            attachments.forEach {
                messageHelper.addAttachment(it.filename, it.inputStreamSource, it.contentType)
            }

            messageHelper.addInline("toet-logo", ClassPathResource("mail-templates/assets/toet-logo.png"))

            mailSender.send(messageHelper.mimeMessage)
        }
    }

}

@ExcludeFromTestCoverage
data class MailAttachment(
    val filename: String,
    val inputStreamSource: InputStreamSource,
    val contentType: String,
)

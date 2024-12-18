package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.io.InputStreamSource
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

@Service
class MailSenderService(
    @Autowired(required = false)
    private val mailSender: JavaMailSender?,
    private val tafelAdminProperties: TafelAdminProperties
) {

    fun sendMail(subject: String, text: String, attachments: List<MailAttachment>) {
        if (mailSender != null) {
            val messageHelper = MimeMessageHelper(mailSender.createMimeMessage(), true)

            val subjectPrefix = tafelAdminProperties.mail?.subjectPrefix ?: ""
            messageHelper.setSubject(subjectPrefix + subject)
            messageHelper.setText(text)

            messageHelper.setFrom(tafelAdminProperties.mail?.from!!)
            tafelAdminProperties.mail.dailyreport?.to?.forEach {
                messageHelper.addTo(it)
            }
            tafelAdminProperties.mail.dailyreport?.cc?.forEach {
                messageHelper.addCc(it)
            }
            tafelAdminProperties.mail.dailyreport?.bcc?.forEach {
                messageHelper.addBcc(it)
            }
            attachments.forEach {
                messageHelper.addAttachment(it.filename, it.inputStreamSource, it.contentType)
            }

            mailSender.send(messageHelper.mimeMessage)
        }
    }

}

@ExcludeFromTestCoverage
data class MailAttachment(
    val filename: String,
    val inputStreamSource: InputStreamSource,
    val contentType: String
)

package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

@Service
class MailSenderService(
    @Autowired(required = false)
    private val mailSender: JavaMailSender?,
    private val tafelAdminProperties: TafelAdminProperties
) {

    fun sendTextMail(subject: String, text: String) {
        if (mailSender != null) {
            val message = SimpleMailMessage()

            message.from = tafelAdminProperties.mail?.from
            message.setTo(*tafelAdminProperties.mail?.dailyreport?.to?.toTypedArray() ?: emptyArray())
            message.setCc(*tafelAdminProperties.mail?.dailyreport?.cc?.toTypedArray() ?: emptyArray())
            message.setBcc(*tafelAdminProperties.mail?.dailyreport?.bcc?.toTypedArray() ?: emptyArray())
            message.subject = subject
            message.text = text

            mailSender.send(message)
        }
    }

}

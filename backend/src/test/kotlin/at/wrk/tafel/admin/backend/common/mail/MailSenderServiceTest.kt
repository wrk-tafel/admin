package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.config.TafelAdminMailDailyReportProperties
import at.wrk.tafel.admin.backend.config.TafelAdminMailProperties
import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.mail.Message
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.core.io.ByteArrayResource
import org.springframework.mail.javamail.JavaMailSender
import java.io.ByteArrayInputStream

@ExtendWith(MockKExtension::class)
internal class MailSenderServiceTest {

    @RelaxedMockK
    private lateinit var mailSender: JavaMailSender

    @RelaxedMockK
    private lateinit var properties: TafelAdminProperties

    @InjectMockKs
    private lateinit var service: MailSenderService

    @Test
    fun `sendTextMail - mailing disabled`() {
        val service = MailSenderService(null, TafelAdminProperties())
        service.sendMail("subject", "text", emptyList())
    }

    @Test
    fun `sendMail successfully`() {
        val subjectPrefix = "PREFIX - "
        val subject = "subj"
        val text = "txt"

        val mailProperties = TafelAdminMailProperties(
            from = "from-address",
            subjectPrefix = "PREFIX - ",
            dailyreport = TafelAdminMailDailyReportProperties(
                to = listOf("to1@host.at", "to2@host.at"),
                bcc = listOf("bcc1@host.at", "bcc2@host.at")
            )
        )
        every { properties.mail } returns mailProperties

        val attachment = MailAttachment(
            filename = "test.pdf",
            inputStreamSource = ByteArrayResource(ByteArray(10)),
            contentType = "application/pdf"
        )
        every { mailSender.createMimeMessage() } returns MimeMessage(null, ByteArrayInputStream(ByteArray(0)))

        service.sendMail(subject, text, listOf(attachment))

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailSender.send(capture(mailMessageSlot)) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.subject).isEqualTo(subjectPrefix + subject)

        assertThat(mailMessage.getHeader("Subject").first()).isEqualTo(subjectPrefix + subject)
        assertThat(mailMessage.getHeader("From").first()).isEqualTo(mailProperties.from)

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).isEqualTo(mailProperties.dailyreport!!.to)

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).isEqualTo(mailProperties.dailyreport.bcc)

        /*
        TODO add asserts
        assertThat(mailMessage.content).isEqualTo(text)
        assertThat(mailMessage.attachment).isEqualTo(text)
         */
    }

}

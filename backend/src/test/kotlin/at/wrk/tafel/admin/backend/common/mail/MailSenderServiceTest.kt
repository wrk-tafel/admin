package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailRecipientAddressesProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
        val service = MailSenderService(null, properties)
        every { properties.mail!!.from } returns "from-address"

        service.sendMail(TafelAdminMailRecipientAddressesProperties(), "subject", "text", emptyList())
    }

    @Test
    fun `sendMail successfully`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val subjectPrefix = "PREFIX - "
        every { properties.mail!!.subjectPrefix } returns subjectPrefix

        val subject = "subj"
        val text = "txt"

        val recipientAddresses = TafelAdminMailRecipientAddressesProperties(
            to = listOf("to1@host.at", "to2@host.at"),
            bcc = listOf("bcc1@host.at", "bcc2@host.at")
        )

        val attachment = MailAttachment(
            filename = "test.pdf",
            inputStreamSource = ByteArrayResource(ByteArray(10)),
            contentType = "application/pdf"
        )
        every { mailSender.createMimeMessage() } returns MimeMessage(null, ByteArrayInputStream(ByteArray(0)))

        service.sendMail(recipientAddresses, subject, text, listOf(attachment))

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailSender.send(capture(mailMessageSlot)) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.subject).isEqualTo(subjectPrefix + subject)

        assertThat(mailMessage.getHeader("Subject").first()).isEqualTo(subjectPrefix + subject)
        assertThat(mailMessage.getHeader("From").first()).isEqualTo(fromAddress)

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).isEqualTo(recipientAddresses.to)

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).isEqualTo(recipientAddresses.bcc)

        /*
        TODO add asserts
        // TODO assert html type
        assertThat(mailMessage.content).isEqualTo(text)
        assertThat(mailMessage.attachment).isEqualTo(text)
         */
    }

}

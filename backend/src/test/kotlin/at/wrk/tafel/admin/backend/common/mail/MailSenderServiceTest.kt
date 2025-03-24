package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.base.MailRecipientRepository
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.base.RecipientType
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_BCC1
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_BCC2
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_TO1
import at.wrk.tafel.admin.backend.database.model.base.testMailRecipient_DR_TO2
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
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.io.ByteArrayInputStream

@ExtendWith(MockKExtension::class)
internal class MailSenderServiceTest {

    @RelaxedMockK
    private lateinit var mailSender: JavaMailSender

    @RelaxedMockK
    private lateinit var properties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var mailRecipientRepository: MailRecipientRepository

    @RelaxedMockK
    private lateinit var templateEngine: TemplateEngine

    @InjectMockKs
    private lateinit var service: MailSenderService

    // TODO add a rendering test (maybe as a seperate integration-test)

    @Test
    fun `sendTextMail - mailing disabled`() {
        val service = MailSenderService(null, properties, mailRecipientRepository, templateEngine)
        every { properties.mail!!.from } returns "from-address"

        service.sendTextMail(MailType.DAILY_REPORT, "subject", "text", emptyList())

        verify(exactly = 0) { mailSender.send(any<MimeMessage>()) }
    }

    @Test
    fun `sendTextMail successfully`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val subjectPrefix = "PREFIX - "
        every { properties.mail!!.subjectPrefix } returns subjectPrefix

        val recipientAddresses = listOf(
            testMailRecipient_DR_TO1,
            testMailRecipient_DR_TO2,
            testMailRecipient_DR_BCC1,
            testMailRecipient_DR_BCC2,
        )
        every { mailRecipientRepository.findAllByMailType(MailType.DAILY_REPORT) } returns recipientAddresses

        val subject = "subj"
        val text = "txt"

        val attachment = MailAttachment(
            filename = "test.pdf",
            inputStreamSource = ByteArrayResource(ByteArray(10)),
            contentType = "application/pdf"
        )
        every { mailSender.createMimeMessage() } returns MimeMessage(null, ByteArrayInputStream(ByteArray(0)))

        service.sendTextMail(MailType.DAILY_REPORT, subject, text, listOf(attachment))

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailSender.send(capture(mailMessageSlot)) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.subject).isEqualTo(subjectPrefix + subject)

        assertThat(mailMessage.getHeader("Subject").first()).isEqualTo(subjectPrefix + subject)
        assertThat(mailMessage.getHeader("From").first()).isEqualTo(fromAddress)

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.TO }
                .map { it.address }
        )

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.BCC }
                .map { it.address }
        )
    }

    @Test
    fun `sendHtmlMail - mailing disabled`() {
        val service = MailSenderService(null, properties, mailRecipientRepository, templateEngine)
        every { properties.mail!!.from } returns "from-address"

        service.sendHtmlMail(
            mailType = MailType.DAILY_REPORT,
            subject = "subject",
            attachments = emptyList(),
            templateName = "templateName",
            context = Context()
        )

        verify(exactly = 0) { mailSender.send(any<MimeMessage>()) }
    }

    @Test
    fun `sendHtmlMail successfully`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val subjectPrefix = "PREFIX - "
        every { properties.mail!!.subjectPrefix } returns subjectPrefix

        val recipientAddresses = listOf(
            testMailRecipient_DR_TO1,
            testMailRecipient_DR_TO2,
            testMailRecipient_DR_BCC1,
            testMailRecipient_DR_BCC2,
        )
        every { mailRecipientRepository.findAllByMailType(MailType.DAILY_REPORT) } returns recipientAddresses

        val subject = "subj"
        val subTemplateName = "sub-template-name"
        val context = Context()
        context.setVariable("test-key", "test-value")

        val renderedContent = "rendered content"
        every { templateEngine.process(any<String>(), any<Context>()) } returns renderedContent

        val attachment = MailAttachment(
            filename = "test.pdf",
            inputStreamSource = ByteArrayResource(ByteArray(10)),
            contentType = "application/pdf"
        )
        every { mailSender.createMimeMessage() } returns MimeMessage(null, ByteArrayInputStream(ByteArray(0)))

        service.sendHtmlMail(MailType.DAILY_REPORT, subject, listOf(attachment), subTemplateName, context)

        verify { templateEngine.process("mail-layout", context) }
        assertThat(context.getVariable("subTemplate")).isEqualTo(subTemplateName)

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailSender.send(capture(mailMessageSlot)) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.subject).isEqualTo(subjectPrefix + subject)

        assertThat(mailMessage.getHeader("Subject").first()).isEqualTo(subjectPrefix + subject)
        assertThat(mailMessage.getHeader("From").first()).isEqualTo(fromAddress)

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.TO }
                .map { it.address }
        )

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.BCC }
                .map { it.address }
        )

        /*
        TODO add asserts
        // TODO assert html type
        assertThat(mailMessage.content).isEqualTo(renderedContent)
        assertThat(mailMessage.attachment).isEqualTo(TODO)
         */
    }

    @Test
    fun `sendMail in addition to default recipients`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val defaultRecipients = listOf(
            "default1", "default2"
        )
        every { properties.mail?.defaultRecipientsBcc } returns defaultRecipients

        every { mailRecipientRepository.findAllByMailType(MailType.DAILY_REPORT) } returns listOf(
            testMailRecipient_DR_TO1,
            testMailRecipient_DR_TO2,
        )
        every { mailSender.createMimeMessage() } returns MimeMessage(null, ByteArrayInputStream(ByteArray(0)))

        service.sendTextMail(MailType.DAILY_REPORT, "", "")

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailSender.send(capture(mailMessageSlot)) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).hasSameElementsAs(
            listOf(
                testMailRecipient_DR_TO1,
                testMailRecipient_DR_TO2,
            ).map { it.address }
        )

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).hasSameElementsAs(defaultRecipients)
    }

}

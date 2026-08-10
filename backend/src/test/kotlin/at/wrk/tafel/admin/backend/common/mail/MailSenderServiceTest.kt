package at.wrk.tafel.admin.backend.common.mail

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.mailoutbox.MailOutboxService
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
import jakarta.mail.Multipart
import jakarta.mail.Part
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.core.io.ByteArrayResource
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context

@ExtendWith(MockKExtension::class)
internal class MailSenderServiceTest {

    @RelaxedMockK
    private lateinit var properties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var mailRecipientRepository: MailRecipientRepository

    @RelaxedMockK
    private lateinit var templateEngine: TemplateEngine

    @RelaxedMockK
    private lateinit var mailOutboxService: MailOutboxService

    @InjectMockKs
    private lateinit var service: MailSenderService

    /**
     * `tafeladmin.mail` unset is the normal state of a dev environment - there is nobody to send
     * from, so the mail is skipped instead of failing on a missing `from` address.
     */
    @Test
    fun `sendTextMail - no mail configuration`() {
        every { properties.mail } returns null

        service.sendTextMail(MailType.DAILY_REPORT, "subject", "text", emptyList())

        verify(exactly = 0) { mailOutboxService.enqueue(any(), any(), any()) }
    }

    @Test
    fun `sendTextMail successfully`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val subjectPrefix = "[PREFIX]"
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
            contentType = "application/pdf",
        )

        service.sendTextMail(MailType.DAILY_REPORT, subject, text, listOf(attachment))

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailOutboxService.enqueue(capture(mailMessageSlot), any(), any()) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.subject).isEqualTo("$subjectPrefix $subject")

        assertThat(mailMessage.getHeader("Subject").first()).isEqualTo("$subjectPrefix $subject")
        assertThat(mailMessage.getHeader("From").first()).isEqualTo(fromAddress)

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.TO }
                .map { it.address },
        )

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.BCC }
                .map { it.address },
        )
    }

    @Test
    fun `sendTextMail successfully - no subject prefix configured`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress
        every { properties.mail!!.subjectPrefix } returns null

        every { mailRecipientRepository.findAllByMailType(MailType.DAILY_REPORT) } returns emptyList()

        val subject = "subj"
        service.sendTextMail(MailType.DAILY_REPORT, subject, "txt")

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailOutboxService.enqueue(capture(mailMessageSlot), any(), any()) }

        // Regression guard: an unset prefix must not leave a stray leading space in the subject.
        assertThat(mailMessageSlot.captured.subject).isEqualTo(subject)
    }

    @Test
    fun `sendHtmlMail - no mail configuration`() {
        every { properties.mail } returns null

        service.sendHtmlMail(
            mailType = MailType.DAILY_REPORT,
            subject = "subject",
            attachments = emptyList(),
            templateName = "templateName",
            context = Context(),
        )

        verify(exactly = 0) { mailOutboxService.enqueue(any(), any(), any()) }
    }

    @Test
    fun `sendHtmlMail successfully`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val subjectPrefix = "[PREFIX]"
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
            contentType = "application/pdf",
        )

        service.sendHtmlMail(MailType.DAILY_REPORT, subject, listOf(attachment), subTemplateName, context)

        verify { templateEngine.process("mail-layout", context) }
        assertThat(context.getVariable("subTemplate")).isEqualTo(subTemplateName)

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailOutboxService.enqueue(capture(mailMessageSlot), any(), any()) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull
        assertThat(mailMessage.subject).isEqualTo("$subjectPrefix $subject")

        assertThat(mailMessage.getHeader("Subject").first()).isEqualTo("$subjectPrefix $subject")
        assertThat(mailMessage.getHeader("From").first()).isEqualTo(fromAddress)

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.TO }
                .map { it.address },
        )

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).hasSameElementsAs(
            recipientAddresses
                .filter { it.recipientType == RecipientType.BCC }
                .map { it.address },
        )

        // Content-Type headers on the in-memory part tree are only populated from the
        // DataHandler once updateHeaders() runs (normally triggered by writeTo() when the
        // message is actually transmitted, which doesn't happen here since the message is only queued).
        mailMessage.saveChanges()

        val textPart = findPartByMimeType(mailMessage, "text/html")
        assertThat(textPart).isNotNull
        assertThat(textPart!!.content).isEqualTo(renderedContent)

        val attachmentPart = findPartByFilename(mailMessage, attachment.filename)
        assertThat(attachmentPart).isNotNull
        assertThat(attachmentPart!!.contentType).contains(attachment.contentType)
    }

    @Test
    fun `sendHtmlMailTo sends to the given addresses without asking the repository`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress
        every { properties.mail!!.subjectPrefix } returns "[PREFIX]"
        every { properties.mail?.defaultRecipientsBcc } returns listOf("archive@localhost")
        every { templateEngine.process(any<String>(), any<Context>()) } returns "rendered content"

        val context = Context()
        service.sendHtmlMailTo(
            recipients = listOf("support1@localhost", "support2@localhost"),
            subject = "subj",
            templateName = "mails/support-request-mail",
            context = context,
        )

        verify { templateEngine.process("mail-layout", context) }
        assertThat(context.getVariable("subTemplate")).isEqualTo("mails/support-request-mail")

        // the recipients are configuration, so nothing may be looked up in mail_recipients here
        verify(exactly = 0) { mailRecipientRepository.findAllByMailType(any()) }

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailOutboxService.enqueue(capture(mailMessageSlot), any(), any()) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage.subject).isEqualTo("[PREFIX] subj")
        assertThat(mailMessage.getRecipients(Message.RecipientType.TO).map { it.toString() })
            .containsExactly("support1@localhost", "support2@localhost")
        assertThat(mailMessage.getRecipients(Message.RecipientType.CC)).isNull()
        assertThat(mailMessage.getRecipients(Message.RecipientType.BCC).map { it.toString() })
            .containsExactly("archive@localhost")

        // subject and recipients are handed over separately so the queue can be read without MIME
        verify {
            mailOutboxService.enqueue(
                any(),
                "[PREFIX] subj",
                listOf("support1@localhost", "support2@localhost"),
            )
        }
    }

    @Test
    fun `sendMail in addition to default recipients`() {
        val fromAddress = "from-address"
        every { properties.mail!!.from } returns fromAddress

        val defaultRecipients = listOf(
            "default1",
            "default2",
        )
        every { properties.mail?.defaultRecipientsBcc } returns defaultRecipients

        every { mailRecipientRepository.findAllByMailType(MailType.DAILY_REPORT) } returns listOf(
            testMailRecipient_DR_TO1,
            testMailRecipient_DR_TO2,
        )

        service.sendTextMail(MailType.DAILY_REPORT, "", "")

        val mailMessageSlot = slot<MimeMessage>()
        verify { mailOutboxService.enqueue(capture(mailMessageSlot), any(), any()) }

        val mailMessage = mailMessageSlot.captured
        assertThat(mailMessage).isNotNull

        val toRecipients = mailMessage.getRecipients(Message.RecipientType.TO)
        assertThat(toRecipients.map { it.toString() }).hasSameElementsAs(
            listOf(
                testMailRecipient_DR_TO1,
                testMailRecipient_DR_TO2,
            ).map { it.address },
        )

        val ccRecipients = mailMessage.getRecipients(Message.RecipientType.CC)
        assertThat(ccRecipients).isNull()

        val bccRecipients = mailMessage.getRecipients(Message.RecipientType.BCC)
        assertThat(bccRecipients.map { it.toString() }).hasSameElementsAs(defaultRecipients)
    }

    private fun findPartByMimeType(part: Part, mimeType: String): Part? {
        if (part.isMimeType(mimeType)) {
            return part
        }
        val content = part.content
        if (content is Multipart) {
            for (i in 0 until content.count) {
                findPartByMimeType(content.getBodyPart(i), mimeType)?.let { return it }
            }
        }
        return null
    }

    private fun findPartByFilename(part: Part, filename: String): Part? {
        if (part.fileName == filename) {
            return part
        }
        val content = part.content
        if (content is Multipart) {
            for (i in 0 until content.count) {
                findPartByFilename(content.getBodyPart(i), filename)?.let { return it }
            }
        }
        return null
    }
}

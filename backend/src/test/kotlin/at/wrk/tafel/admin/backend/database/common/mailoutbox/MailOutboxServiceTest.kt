package at.wrk.tafel.admin.backend.database.common.mailoutbox

import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.mail.Session
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.Limit
import org.springframework.mail.MailSendException
import org.springframework.mail.javamail.JavaMailSender
import java.io.ByteArrayInputStream
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Properties

@ExtendWith(MockKExtension::class)
class MailOutboxServiceTest {

    @RelaxedMockK
    private lateinit var mailOutboxRepository: MailOutboxRepository

    @RelaxedMockK
    private lateinit var mailSender: JavaMailSender

    private val now = LocalDateTime.of(2026, 3, 22, 10, 15, 30)
    private val clock = Clock.fixed(Instant.parse("2026-03-22T09:15:30Z"), ZoneId.of("Europe/Vienna"))

    @BeforeEach
    fun beforeEach() {
        // a relaxed mock would hand back a bare Object for the generic save()
        every { mailOutboxRepository.save(any<MailOutboxEntity>()) } answers { firstArg() }
    }

    @Test
    fun `enqueue stores the composed message, its subject and its recipients as pending`() {
        val service = MailOutboxService(mailOutboxRepository, mailSender, clock)

        service.enqueue(mimeMessage("subject"), "subject", listOf("to1@localhost", "to2@localhost"))

        val entitySlot = slot<MailOutboxEntity>()
        verify { mailOutboxRepository.save(capture(entitySlot)) }

        val entity = entitySlot.captured
        assertThat(entity.subject).isEqualTo("subject")
        assertThat(entity.recipients).isEqualTo("to1@localhost, to2@localhost")
        assertThat(entity.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(entity.attempts).isZero()
        assertThat(entity.createdAt).isEqualTo(now)
        // due immediately - the poller decides when it actually goes out
        assertThat(entity.nextAttemptAt).isEqualTo(now)
        assertThat(String(entity.message!!)).contains("Subject: subject")
    }

    @Test
    fun `sending marks a mail as sent`() {
        val service = MailOutboxService(mailOutboxRepository, mailSender, clock)
        val pendingMail = pendingMail()
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(
                MailOutboxStatus.PENDING,
                now,
                any<Limit>(),
            )
        } returns listOf(pendingMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")

        service.sendPendingMails()

        verify { mailSender.send(any<MimeMessage>()) }
        assertThat(pendingMail.status).isEqualTo(MailOutboxStatus.SENT)
        assertThat(pendingMail.sentAt).isEqualTo(now)
        assertThat(pendingMail.attempts).isEqualTo(1)
        assertThat(pendingMail.lastError).isNull()
        verify { mailOutboxRepository.save(pendingMail) }
    }

    @Test
    fun `a failed send is retried later with the error recorded`() {
        val service = MailOutboxService(mailOutboxRepository, mailSender, clock)
        val pendingMail = pendingMail()
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(pendingMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        assertThat(pendingMail.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(pendingMail.attempts).isEqualTo(1)
        assertThat(pendingMail.lastError).contains("smtp is down")
        assertThat(pendingMail.nextAttemptAt).isEqualTo(now.plusMinutes(5))
        verify { mailOutboxRepository.save(pendingMail) }
    }

    @Test
    fun `a mail is given up on after the last attempt and kept with its error`() {
        val service = MailOutboxService(mailOutboxRepository, mailSender, clock)
        val pendingMail = pendingMail().apply { attempts = 4 }
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(pendingMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        assertThat(pendingMail.status).isEqualTo(MailOutboxStatus.FAILED)
        assertThat(pendingMail.attempts).isEqualTo(5)
        assertThat(pendingMail.lastError).contains("smtp is down")
        verify { mailOutboxRepository.save(pendingMail) }
    }

    @Test
    fun `one failing mail does not stop the rest of the batch`() {
        val service = MailOutboxService(mailOutboxRepository, mailSender, clock)
        val failing = pendingMail()
        val succeeding = pendingMail()
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(failing, succeeding)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down") andThen Unit

        service.sendPendingMails()

        assertThat(failing.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(succeeding.status).isEqualTo(MailOutboxStatus.SENT)
    }

    @Test
    fun `nothing is polled when no mail server is configured`() {
        val service = MailOutboxService(mailOutboxRepository, null, clock)

        service.sendPendingMails()

        verify(exactly = 0) {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        }
    }

    @Test
    fun `cleanup removes sent mails older than the retention window`() {
        val service = MailOutboxService(mailOutboxRepository, mailSender, clock)

        service.cleanupSentMails()

        verify {
            mailOutboxRepository.deleteAllByStatusAndSentAtBefore(MailOutboxStatus.SENT, now.minusDays(14))
        }
    }

    private fun pendingMail() = MailOutboxEntity().apply {
        createdAt = now
        subject = "subject"
        recipients = "to@localhost"
        message = "raw message".toByteArray()
        status = MailOutboxStatus.PENDING
        nextAttemptAt = now
    }

    private fun mimeMessage(subject: String) = MimeMessage(Session.getInstance(Properties())).apply {
        setSubject(subject)
        setRecipient(jakarta.mail.Message.RecipientType.TO, InternetAddress("to@localhost"))
        setText("text")
        saveChanges()
    }
}

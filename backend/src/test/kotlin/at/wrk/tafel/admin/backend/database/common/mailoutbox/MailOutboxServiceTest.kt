package at.wrk.tafel.admin.backend.database.common.mailoutbox

import at.wrk.tafel.admin.backend.config.properties.TafelAdminMailOutboxProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.mail.Session
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.domain.Limit
import org.springframework.mail.MailSendException
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.io.ByteArrayInputStream
import java.time.Clock
import java.time.Duration
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

    @RelaxedMockK
    private lateinit var eventPublisher: ApplicationEventPublisher

    private val now = LocalDateTime.of(2026, 3, 22, 10, 15, 30)
    private val clock = Clock.fixed(Instant.parse("2026-03-22T09:15:30Z"), ZoneId.of("Europe/Vienna"))

    @BeforeEach
    fun beforeEach() {
        // a relaxed mock would hand back a bare Object for the generic save()
        every { mailOutboxRepository.save(any<MailOutboxEntity>()) } answers { firstArg() }
    }

    @Test
    fun `enqueue stores the composed message, its subject and its recipients as pending`() {
        val service = service()

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
        val service = service()
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
        val service = service()
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
        val service = service()
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
    fun `giving up on a mail announces it, so the failure is not just a row nobody reads`() {
        val service = service()
        val pendingMail = pendingMail().apply { attempts = 4 }
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(pendingMail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        val eventSlot = slot<MailDeliveryFailedEvent>()
        verify { eventPublisher.publishEvent(capture(eventSlot)) }
        assertThat(eventSlot.captured.subject).isEqualTo("subject")
        assertThat(eventSlot.captured.recipients).isEqualTo("to@localhost")
        assertThat(eventSlot.captured.lastError).contains("smtp is down")
    }

    @Test
    fun `a mail that will be retried announces nothing yet`() {
        val service = service()
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(pendingMail())
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        verify(exactly = 0) { eventPublisher.publishEvent(any<MailDeliveryFailedEvent>()) }
    }

    /**
     * Queuing a mail is a write, so a read-only caller cannot do it. It is rejected here with a
     * message naming the cause, rather than several frames deeper by Postgres refusing
     * `mail_outbox_seq`'s `nextval()` - which is what made this fail silently the first time.
     */
    @Test
    fun `enqueue refuses a read-only transaction and says why`() {
        val service = service()
        TransactionSynchronizationManager.setActualTransactionActive(true)
        TransactionSynchronizationManager.setCurrentTransactionReadOnly(true)

        try {
            assertThatThrownBy { service.enqueue(mimeMessage("subject"), "subject", listOf("to@localhost")) }
                .isInstanceOf(IllegalStateException::class.java)
                .hasMessageContaining("read-only")

            verify(exactly = 0) { mailOutboxRepository.save(any<MailOutboxEntity>()) }
        } finally {
            TransactionSynchronizationManager.setCurrentTransactionReadOnly(false)
            TransactionSynchronizationManager.setActualTransactionActive(false)
        }
    }

    @Test
    fun `one failing mail does not stop the rest of the batch`() {
        val service = service()
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

    /**
     * With nothing to deliver to, a queued mail would only pile up - so it is not queued at all.
     * This is the one place that asks whether a mail server exists; `MailSenderService` composes
     * either way.
     */
    @Test
    fun `nothing is queued when no mail server is configured`() {
        val service = service(mailSender = null)

        service.enqueue(mimeMessage("subject"), "subject", listOf("to@localhost"))

        verify(exactly = 0) { mailOutboxRepository.save(any<MailOutboxEntity>()) }
    }

    @Test
    fun `nothing is polled when no mail server is configured`() {
        val service = service(mailSender = null)

        service.sendPendingMails()

        verify(exactly = 0) {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        }
    }

    /**
     * The tuning is configuration, not constants - an operator raising the backoff during a mail
     * server incident has to actually take effect.
     */
    @Test
    fun `configured attempt limit and backoff are what is applied`() {
        val service = service(
            properties = TafelAdminMailOutboxProperties().apply {
                maxAttempts = 2
                retryBackoff = Duration.ofSeconds(30)
                maxRetryBackoff = Duration.ofMinutes(2)
            },
        )
        val firstFailure = pendingMail()
        val lastAttempt = pendingMail().apply { attempts = 1 }
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(firstFailure, lastAttempt)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        assertThat(firstFailure.status).isEqualTo(MailOutboxStatus.PENDING)
        assertThat(firstFailure.nextAttemptAt).isEqualTo(now.plusSeconds(30))
        // second attempt of two - given up on, where the default of five would still be retrying
        assertThat(lastAttempt.status).isEqualTo(MailOutboxStatus.FAILED)
    }

    @Test
    fun `the growing backoff is capped`() {
        val service = service(
            properties = TafelAdminMailOutboxProperties().apply {
                maxAttempts = 10
                retryBackoff = Duration.ofMinutes(5)
                maxRetryBackoff = Duration.ofMinutes(12)
            },
        )
        val mail = pendingMail().apply { attempts = 5 }
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns listOf(mail)
        every { mailSender.createMimeMessage(any<ByteArrayInputStream>()) } returns mimeMessage("subject")
        every { mailSender.send(any<MimeMessage>()) } throws MailSendException("smtp is down")

        service.sendPendingMails()

        // 6 x 5min would be 30, the cap is 12
        assertThat(mail.nextAttemptAt).isEqualTo(now.plusMinutes(12))
    }

    @Test
    fun `the batch size limits what one poll takes on`() {
        val service = service(properties = TafelAdminMailOutboxProperties().apply { batchSize = 3 })
        every {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), any<Limit>())
        } returns emptyList()

        service.sendPendingMails()

        val limitSlot = slot<Limit>()
        verify {
            mailOutboxRepository.findAllByStatusAndNextAttemptAtLessThanEqualOrderByIdAsc(any(), any(), capture(limitSlot))
        }
        assertThat(limitSlot.captured.max()).isEqualTo(3)
    }

    @Test
    fun `cleanup removes sent mails older than the retention window`() {
        val service = service()

        service.cleanupSentMails()

        verify {
            mailOutboxRepository.deleteAllByStatusAndSentAtBefore(MailOutboxStatus.SENT, now.minusDays(14))
        }
    }

    private fun service(
        mailSender: JavaMailSender? = this.mailSender,
        properties: TafelAdminMailOutboxProperties = TafelAdminMailOutboxProperties(),
    ) = MailOutboxService(
        mailOutboxRepository,
        mailSender,
        clock,
        eventPublisher,
        TafelAdminProperties().apply { mailOutbox = properties },
    )

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
